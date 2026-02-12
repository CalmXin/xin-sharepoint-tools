from pathlib import Path

_BASE_DIR = Path(__file__).parent

# 保证日志目录存在
Path(_BASE_DIR / 'log').mkdir(parents=True, exist_ok=True)

# 项目目录
chdir = str(_BASE_DIR.resolve())

# 指定进程数
workers = 2

# 指定每个进程开启的线程数
threads = 4

# 启动模式
worker_class = 'threads'

# 绑定的ip与端口
bind = '0.0.0.0:12345'

# 设置访问日志和错误信息日志路径
accesslog = f'{chdir}/log/gunicorn_access.log'
errorlog = f'{chdir}/log/gunicorn_error.log'

loglevel = 'info'
