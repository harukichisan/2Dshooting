@tool
extends EditorPlugin

var http_server = null
var mcp_port = 3000

func _enter_tree():
	print("Claude MCP Integration プラグインが有効化されました")
	setup_mcp_server()

func _exit_tree():
	print("Claude MCP Integration プラグインが無効化されました")
	if http_server:
		http_server.stop()

func setup_mcp_server():
	# MCPサーバーのセットアップ
	# Note: Godotには組み込みHTTPサーバーがないため、
	# 実際のMCP通信はClaude Code側の.claude.jsonで設定されたMCPサーバーを使用します
	print("MCP設定を確認中...")

	var config_path = "res://.claude.json"
	if FileAccess.file_exists(config_path):
		print("✓ .claude.json が見つかりました")
		print("✓ Claude Codeから以下のツールでアクセス可能:")
		print("  - ファイル読み書き")
		print("  - Godotプロジェクト操作")
	else:
		print("⚠ .claude.json が見つかりません")

func _process(_delta):
	# プラグインの定期処理（必要に応じて）
	pass
