#! /bin/bash

WORK_DIR=$(dirname "$0")
VENV_DIR="$WORK_DIR/.venv"
CONFIG_FILE="gunicorn_config.py"
cd "$WORK_DIR" || exit

if [ ! -d "$VENV_DIR" ]; then
    echo "虚拟环境不存在，正在创建……"
    python3 -m venv "$VENV_DIR"

    source "$VENV_DIR/bin/activate"
    pip install -r "$WORK_DIR/requirements.txt"
    pip install gunicorn
else
  echo "检测到虚拟环境，开始执行……"
    source "$VENV_DIR/bin/activate"
fi

exec gunicorn -c $CONFIG_FILE app:app