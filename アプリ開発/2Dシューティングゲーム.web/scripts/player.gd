extends CharacterBody2D

signal player_hit
signal shoot_bullet(position: Vector2)

@export var speed: float = 300.0
@export var max_hp: int = 100

var hp: int = max_hp
var can_shoot: bool = true

@onready var shoot_timer = $ShootTimer

func _ready():
	shoot_timer.start()

func _physics_process(delta):
	# 移動処理
	var direction = Input.get_axis("move_left", "move_right")
	velocity.x = direction * speed

	# 画面内に制限
	position.x = clamp(position.x, 16, 784)
	position.y = 550

	move_and_slide()

	# 射撃処理
	if Input.is_action_pressed("shoot") and can_shoot:
		shoot()
		can_shoot = false
		shoot_timer.start()

func shoot():
	shoot_bullet.emit(position + Vector2(0, -20))

func take_damage(damage: int):
	hp -= damage
	if hp < 0:
		hp = 0
	player_hit.emit()

	if hp <= 0:
		die()

func die():
	queue_free()

func _on_shoot_timer_timeout():
	can_shoot = true
