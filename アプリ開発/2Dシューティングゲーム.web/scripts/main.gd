extends Node2D

var score: int = 0
var high_score: int = 0
var wave: int = 1
var game_over: bool = false

@onready var score_label = $UI/HUD/ScoreLabel
@onready var high_score_label = $UI/HUD/HighScoreLabel
@onready var hp_label = $UI/HUD/HPLabel
@onready var wave_label = $UI/HUD/WaveLabel
@onready var game_over_label = $UI/GameOver

func _ready():
	load_high_score()
	update_ui()

func _process(_delta):
	if game_over and Input.is_action_just_pressed("restart"):
		restart_game()

func add_score(points: int):
	score += points
	if score > high_score:
		high_score = score
		save_high_score()
	update_ui()

func update_hp(hp: int):
	hp_label.text = "HP: " + str(hp)
	if hp <= 0:
		trigger_game_over()

func update_wave(new_wave: int):
	wave = new_wave
	wave_label.text = "WAVE " + str(wave)

func update_ui():
	score_label.text = "SCORE: " + str(score)
	high_score_label.text = "HIGH: " + str(high_score)
	wave_label.text = "WAVE " + str(wave)

func trigger_game_over():
	game_over = true
	game_over_label.visible = true
	get_tree().paused = true

func restart_game():
	get_tree().paused = false
	get_tree().reload_current_scene()

func load_high_score():
	if FileAccess.file_exists("user://high_score.save"):
		var file = FileAccess.open("user://high_score.save", FileAccess.READ)
		high_score = file.get_32()
		file.close()

func save_high_score():
	var file = FileAccess.open("user://high_score.save", FileAccess.WRITE)
	file.store_32(high_score)
	file.close()
