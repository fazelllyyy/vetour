/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Zulfazli (fazelstudio). All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

// Tiling feature is implemented but not yet connected to the frontend.
#![allow(dead_code)]

use image::codecs::jpeg::JpegEncoder;
use image::imageops::FilterType;
use image::{EncodableLayout, ImageEncoder};
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::{BufWriter, Write};
use std::path::Path;
use tauri::{AppHandle, Emitter};

#[derive(Serialize, Deserialize, Clone)]
pub struct ProcessProgress {
    pub scene_id: String,
    pub status: String,
    pub progress: u8,
    pub resolutions: Option<Vec<ResolutionPath>>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ResolutionPath {
    pub label: String,
    pub path: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct TileInfo {
    pub manifest_path: String,
    pub tile_dir: String,
    pub tile_files: Vec<String>,
    pub config: TileConfig,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct TileConfig {
    pub width: u32,
    pub levels: Vec<TileLevelConfig>,
    pub base_url: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct TileLevelConfig {
    pub width: u32,
    pub cols: u32,
    pub rows: u32,
    pub zoom_range: [u8; 2],
}

#[derive(Serialize, Deserialize, Clone)]
pub struct TilingProgress {
    pub scene_id: String,
    pub status: String,
    pub progress: u8,
    pub current_tile: Option<String>,
}

#[tauri::command]
pub async fn process_panorama(
    app: AppHandle,
    scene_id: String,
    source_path: String,
    output_dir: String,
) -> Result<Vec<ResolutionPath>, String> {
    let scene_id_clone = scene_id.clone();
    
    let result = tauri::async_runtime::spawn_blocking(move || {
        let emit_progress = |status: &str, progress: u8| {
            let _ = app.emit(
                "process_progress",
                ProcessProgress {
                    scene_id: scene_id_clone.clone(),
                    status: status.to_string(),
                    progress,
                    resolutions: None,
                },
            );
        };

        emit_progress("Loading image...", 10);
        let img = match image::open(&source_path) {
            Ok(i) => i,
            Err(e) => return Err(format!("Failed to open image: {}", e)),
        };

        emit_progress("Resizing to 4096px...", 40);

        let target_width = 4096u32;
        let aspect_ratio = img.height() as f32 / img.width() as f32;
        let target_height = (target_width as f32 * aspect_ratio) as u32;

        let resized = if img.width() > target_width {
            img.resize_exact(target_width, target_height, FilterType::CatmullRom)
        } else {
            img.clone()
        };

        emit_progress("Encoding WebP...", 70);

        let out_filename = format!("{}_high.webp", scene_id_clone);
        let out_path = Path::new(&output_dir).join(&out_filename);

        if let Some(parent) = out_path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }

        let mut file = match File::create(&out_path) {
            Ok(f) => f,
            Err(e) => return Err(format!("Failed to create output file: {}", e)),
        };

        let encoded = webp::Encoder::from_image(&resized)
            .map_err(|e| format!("Failed to create WebP encoder: {}", e))?
            .encode(80f32);
        file.write_all(&encoded)
            .map_err(|e| format!("Failed to write WebP: {}", e))?;

        emit_progress("Complete", 100);

        let mut output_paths = Vec::new();
        output_paths.push(ResolutionPath {
            label: "high".to_string(),
            path: out_path.to_string_lossy().to_string(),
        });

        Ok(output_paths)
    })
    .await;

    match result {
        Ok(res) => res,
        Err(e) => Err(format!("Task failed: {}", e)),
    }
}

#[tauri::command]
pub async fn tile_panorama(
    app: AppHandle,
    scene_id: String,
    source_path: String,
    output_dir: String,
) -> Result<TileInfo, String> {
    let scene_id_clone = scene_id.clone();

    let result = tauri::async_runtime::spawn_blocking(move || {
        let emit = |status: &str, progress: u8, tile: Option<String>| {
            let _ = app.emit(
                "tiling_progress",
                TilingProgress {
                    scene_id: scene_id_clone.clone(),
                    status: status.to_string(),
                    progress,
                    current_tile: tile,
                },
            );
        };

        emit("Loading image...", 5, None);
        let img = match image::open(&source_path) {
            Ok(i) => i,
            Err(e) => return Err(format!("Failed to open image: {}", e)),
        };

        let img_width = img.width();
        let img_height = img.height();

        // Determine tile levels based on image width
        let base_width: u32 = 2048;
        
        // Calculate how many levels needed
        let num_levels = ((img_width as f64 / base_width as f64).log2().ceil() as u32).max(2).min(4);
        
        let tile_size = 512u32;

        let mut levels: Vec<TileLevelConfig> = Vec::new();
        let mut tile_files: Vec<String> = Vec::new();

        let scene_dir = Path::new(&output_dir).join(&scene_id_clone);
        let tile_dir = scene_dir.join("tiles");
        std::fs::create_dir_all(&tile_dir).map_err(|e| format!("Failed to create tile directory: {}", e))?;

        emit("Generating tiles...", 10, None);

        for level_idx in 0..num_levels {
            let level_width = base_width * (2u32.pow(level_idx));
            let level_height = (level_width as f64 * img_height as f64 / img_width as f64).round() as u32;
            
            let cols = (level_width as f64 / tile_size as f64).ceil() as u32;
            let rows = (level_height as f64 / tile_size as f64).ceil() as u32;
            
            let zoom_min = (level_idx as f64 / num_levels as f64 * 100.0) as u8;
            let zoom_max = (((level_idx + 1) as f64 / num_levels as f64) * 100.0) as u8;

            levels.push(TileLevelConfig {
                width: level_width,
                cols,
                rows,
                zoom_range: [zoom_min, zoom_max],
            });

            // Resize image for this level
            let resized = img.resize_exact(level_width, level_height, FilterType::Lanczos3);
            let rgba = resized.to_rgba8();

            let tile_width = (level_width as f64 / cols as f64).ceil() as u32;
            let tile_height = (level_height as f64 / rows as f64).ceil() as u32;

            let total_tiles = cols * rows;
            let mut tiles_done = 0u32;

            for row in 0..rows {
                for col in 0..cols {
                    let x = col * tile_width;
                    let y = row * tile_height;
                    let w = tile_width.min(level_width - x);
                    let h = tile_height.min(level_height - y);

                    let tile_img = image::imageops::crop_imm(&rgba, x, y, w, h).to_image();

                    let level_dir = tile_dir.join(format!("l{}", level_idx));
                    std::fs::create_dir_all(&level_dir).map_err(|e| format!("Failed to create level dir: {}", e))?;

                    let tile_path = level_dir.join(format!("{}_{}.jpg", col, row));
                    let file = File::create(&tile_path).map_err(|e| format!("Failed to create tile file: {}", e))?;
                    let mut writer = BufWriter::new(file);
                    let encoder = JpegEncoder::new_with_quality(&mut writer, 85);
                    encoder
                        .write_image(tile_img.as_bytes(), w, h, image::ExtendedColorType::Rgba8)
                        .map_err(|e| format!("Failed to encode tile: {}", e))?;

                    tile_files.push(tile_path.to_string_lossy().to_string());

                    tiles_done += 1;
                    let progress = 10 + ((tiles_done as f64 / total_tiles as f64) * 80.0) as u8;
                    emit(
                        &format!("Level {}: tile ({},{})", level_idx, col, row),
                        progress,
                        Some(format!("l{}/{}_{}.jpg", level_idx, col, row)),
                    );
                }
            }
        }

        // Save base image (low-res preview)
        let base_path = tile_dir.join("base.jpg");
        {
            let preview_width: u32 = 2048;
            let preview_height = (preview_width as f64 * img_height as f64 / img_width as f64).round() as u32;
            let preview = img.resize_exact(preview_width, preview_height, FilterType::Lanczos3);
            let preview_rgba = preview.to_rgba8();
            let file = File::create(&base_path).map_err(|e| format!("Failed to create base image: {}", e))?;
            let mut writer = BufWriter::new(file);
            let encoder = JpegEncoder::new_with_quality(&mut writer, 80);
            encoder
                .write_image(preview_rgba.as_bytes(), preview_width, preview_height, image::ExtendedColorType::Rgba8)
                .map_err(|e| format!("Failed to encode base image: {}", e))?;
        }
        tile_files.push(base_path.to_string_lossy().to_string());

        // Generate manifest
        let config = TileConfig {
            width: img_width,
            levels,
            base_url: format!("tiles/base.jpg"),
        };

        // Save manifest as JSON next to tiles
        let manifest_path = scene_dir.join("tiles_config.json");
        let manifest_content = serde_json::to_string_pretty(&config)
            .map_err(|e| format!("Failed to serialize manifest: {}", e))?;
        std::fs::write(&manifest_path, &manifest_content)
            .map_err(|e| format!("Failed to write manifest: {}", e))?;

        emit("Complete", 100, None);

        Ok(TileInfo {
            manifest_path: manifest_path.to_string_lossy().to_string(),
            tile_dir: tile_dir.to_string_lossy().to_string(),
            tile_files,
            config,
        })
    })
    .await;

    match result {
        Ok(res) => res,
        Err(e) => Err(format!("Tiling task failed: {}", e)),
    }
}