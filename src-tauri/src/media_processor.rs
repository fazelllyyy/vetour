use std::path::Path;
use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;

fn is_compressed_audio(ext: &str) -> bool {
    matches!(ext, "mp3" | "ogg" | "m4a" | "aac" | "flac" | "wma" | "opus")
}

#[tauri::command]
pub async fn convert_audio(
    app: AppHandle,
    source_path: String,
    output_dir: String,
) -> Result<String, String> {
    let ext = Path::new(&source_path)
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .unwrap_or_default();

    if is_compressed_audio(&ext) || ext != "wav" {
        return Ok(source_path);
    }

    let stem = Path::new(&source_path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("audio");

    let out_dir = Path::new(&output_dir);
    std::fs::create_dir_all(out_dir).map_err(|e| format!("Failed to create output dir: {}", e))?;

    let output_path = out_dir.join(format!("{}.mp3", stem));
    let output_str = output_path.to_string_lossy().to_string();

    let result = app
        .shell()
        .sidecar("ffmpeg")
        .map_err(|e| format!("Failed to find ffmpeg sidecar: {}", e))?
        .args([
            "-y",
            "-i",
            &source_path,
            "-c:a",
            "libmp3lame",
            "-b:a",
            "192k",
            &output_str,
        ])
        .output()
        .await
        .map_err(|e| format!("Failed to launch ffmpeg: {}", e))?;

    if result.status.success() {
        Ok(output_str)
    } else {
        let stderr = String::from_utf8_lossy(&result.stderr);
        Err(format!("Audio conversion failed: {}", stderr))
    }
}

#[tauri::command]
pub async fn convert_video(
    app: AppHandle,
    source_path: String,
    output_dir: String,
) -> Result<String, String> {
    let stem = Path::new(&source_path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("video");

    let out_dir = Path::new(&output_dir);
    std::fs::create_dir_all(out_dir).map_err(|e| format!("Failed to create output dir: {}", e))?;

    let output_path = out_dir.join(format!("{}_compressed.mp4", stem));
    let output_str = output_path.to_string_lossy().to_string();

    let result = app
        .shell()
        .sidecar("ffmpeg")
        .map_err(|e| format!("Failed to find ffmpeg sidecar: {}", e))?
        .args([
            "-y",
            "-i",
            &source_path,
            "-vf",
            "scale='min(1920,iw)':-2",
            "-c:v",
            "libx264",
            "-crf",
            "23",
            "-preset",
            "medium",
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            "-movflags",
            "+faststart",
            &output_str,
        ])
        .output()
        .await
        .map_err(|e| format!("Failed to launch ffmpeg: {}", e))?;

    if result.status.success() {
        Ok(output_str)
    } else {
        let stderr = String::from_utf8_lossy(&result.stderr);
        Err(format!("Video conversion failed: {}", stderr))
    }
}
