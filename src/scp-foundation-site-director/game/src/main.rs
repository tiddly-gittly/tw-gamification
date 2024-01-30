use bevy::{prelude::*, sprite::MaterialMesh2dBundle};
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;
use web_sys::console;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_name = twGamificationSaveGameData)]
    fn save_game_data(data: &str);
}

#[wasm_bindgen]
pub fn start_game() {
    App::new()
        .add_plugins(DefaultPlugins.set(WindowPlugin {
            primary_window: Some(Window {
                canvas: Some(
                    ".tw-gamification-bevy-canvas.scp-foundation-site-director".to_string(),
                ),
                ..default()
            }),
            ..default()
        }))
        .add_systems(Startup, setup)
        .run();
}

// TODO: generate rs type from ts type, like in https://github.com/linonetwo/DarkDaysArch
#[derive(Serialize, Deserialize, Debug)]
struct GamificationEvent {
    // Define the fields according to your JSON structure
    amount: Option<i32>,
    message: Option<String>,
    signature: String,
    timestamp: i64,
    r#type: String,
}

fn main() {
    console::log_1(&"WASM loaded.".into());
}

pub fn get_example_gamification_events() -> String {
    // Example data, replace with your actual data source
    let events = vec![
        GamificationEvent {
            amount: Some(100),
            message: Some("Reward earned".to_string()),
            r#type: "LargeReward".to_string(),
            timestamp: 1672522560,
            signature: "event1".to_string(),
        },
        GamificationEvent {
            amount: Some(50),
            message: Some("Small penalty".to_string()),
            r#type: "SmallPunishment".to_string(),
            timestamp: 1672522600,
            signature: "event2".to_string(),
        },
    ];

    serde_json::to_string(&events).unwrap_or_else(|_| "[]".to_string())
}

#[wasm_bindgen]
pub fn set_gamification_events(events_json_string: &str) {
    match serde_json::from_str::<Vec<GamificationEvent>>(&events_json_string) {
        Ok(events) => {
            // Log each event or the entire array as you prefer
            for event in events {
                console::log_1(&format!("Event: {:?}", event).into());
            }

            // Send the serialized data to JavaScript
            save_game_data(&get_example_gamification_events());
        }
        Err(e) => {
            console::log_1(&format!("Error parsing JSON: {:?}", e).into());
        }
    }
}

fn setup(
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<ColorMaterial>>,
) {
    commands.spawn(Camera2dBundle::default());

    console::log_1(&"Hello from Bevy!".into());
    // Circle
    commands.spawn(MaterialMesh2dBundle {
        mesh: meshes.add(shape::Circle::new(50.).into()).into(),
        material: materials.add(Color::PURPLE.into()),
        transform: Transform::from_translation(Vec3::new(-150., 0., 0.)),
        ..default()
    });

    // Rectangle
    commands.spawn(SpriteBundle {
        sprite: Sprite {
            color: Color::rgb(0.25, 0.25, 0.75),
            custom_size: Some(Vec2::new(50.0, 100.0)),
            ..default()
        },
        transform: Transform::from_translation(Vec3::new(-50., 0., 0.)),
        ..default()
    });

    // Quad
    commands.spawn(MaterialMesh2dBundle {
        mesh: meshes
            .add(shape::Quad::new(Vec2::new(50., 100.)).into())
            .into(),
        material: materials.add(Color::LIME_GREEN.into()),
        transform: Transform::from_translation(Vec3::new(50., 0., 0.)),
        ..default()
    });

    // Hexagon
    commands.spawn(MaterialMesh2dBundle {
        mesh: meshes.add(shape::RegularPolygon::new(50., 6).into()).into(),
        material: materials.add(Color::TURQUOISE.into()),
        transform: Transform::from_translation(Vec3::new(150., 0., 0.)),
        ..default()
    });
}
