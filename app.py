import requests
from flask import Flask, request, jsonify, render_template

app = Flask(__name__)

# CORS 设置
CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
}


@app.route('/api/token', methods=['POST', 'OPTIONS'])
def get_token():
    if request.method == 'OPTIONS':
        return jsonify(""), 204, CORS_HEADERS

    data = request.get_json()
    code = data.get('code')
    redirect_uri = data.get('redirect_uri')
    cloud_env = data.get('cloud_env')
    client_id = data.get('client_id')
    client_secret = data.get('client_secret')

    if not all([code, redirect_uri, cloud_env, client_id, client_secret]):
        return jsonify({'error': '请求体中缺少必要参数。'}), 400

    token_url = (
        'https://login.chinacloudapi.cn/common/oauth2/v2.0/token'
        if cloud_env == 'china'
        else 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
    )

    payload = {
        'client_id': client_id,
        'client_secret': client_secret,
        'code': code,
        'redirect_uri': redirect_uri,
        'grant_type': 'authorization_code',
        'scope': 'offline_access Files.ReadWrite.All Sites.Read.All'
    }

    try:
        response = requests.post(token_url, data=payload)
        return jsonify(response.json()), response.status_code
    except Exception as e:
        return jsonify({'error': '从微软获取令牌失败。', 'details': str(e)}), 500


@app.route('/api/site-id', methods=['POST', 'OPTIONS'])
def get_site_id():
    if request.method == 'OPTIONS':
        return jsonify(""), 204, CORS_HEADERS

    data = request.get_json()
    access_token = data.get('accessToken')
    cloud_env = data.get('cloudEnv')
    hostname = data.get('hostname')
    site_path = data.get('sitePath')

    if not all([access_token, cloud_env, hostname]):
        return jsonify({'error': '查询 Site ID 的请求体中缺少必要参数。'}), 400

    graph_endpoint = 'https://microsoftgraph.chinacloudapi.cn' if cloud_env == 'china' else 'https://graph.microsoft.com'
    relative_path = f':{site_path}' if site_path and site_path != '/' else ''
    site_url = f'{graph_endpoint}/v1.0/sites/{hostname}{relative_path}'

    headers = {'Authorization': f'Bearer {access_token}'}

    try:
        response = requests.get(site_url, headers=headers)
        return jsonify(response.json()), response.status_code
    except Exception as e:
        return jsonify({'error': '从微软 Graph 获取 Site ID 失败。', 'details': str(e)}), 500


@app.route('/')
def index():
    return render_template('index.html')


if __name__ == '__main__':
    app.run(debug=True)
