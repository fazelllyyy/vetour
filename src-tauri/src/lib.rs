/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Zulfazli (fazelstudio). All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

mod image_processor;
mod file_lock;
mod media_processor;

use std::sync::Mutex;
use tauri::{Manager, State};

pub struct PresentData(Mutex<Option<String>>);

#[tauri::command]
fn store_present_data(data: String, state: State<'_, PresentData>) {
    *state.0.lock().unwrap() = Some(data);
}

#[tauri::command]
fn get_present_data(state: State<'_, PresentData>) -> Option<String> {
    state.0.lock().unwrap().clone()
}

#[tauri::command]
fn clear_present_data(state: State<'_, PresentData>) {
    *state.0.lock().unwrap() = None;
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_keyring::init())
        .plugin(tauri_plugin_shell::init())
        .manage(file_lock::FileLockState::default())
        .manage(PresentData(Mutex::new(None)))
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                #[cfg(desktop)]
                {
                    let icon_bytes = include_bytes!("../icons/icon-tast.png");
                    if let Ok(img) = image::load_from_memory(icon_bytes) {
                        let rgba = img.into_rgba8();
                        let width = rgba.width();
                        let height = rgba.height();
                        let tauri_image = tauri::image::Image::new_owned(rgba.into_raw(), width, height);
                        let _ = window.set_icon(tauri_image);
                    }
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            store_present_data,
            get_present_data,
            clear_present_data,
            image_processor::process_panorama,
            media_processor::convert_audio,
            media_processor::convert_video,
            file_lock::lock_project_file,
            file_lock::unlock_project_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}