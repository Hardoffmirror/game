#!/usr/bin/env python3
"""
Flask Web Application для PoE Build Converter
"""

from flask import Flask, render_template, request, jsonify
from pob_parser import PoBParser
import traceback

app = Flask(__name__)


@app.route('/')
def index():
    """Главная страница"""
    return render_template('index.html')


@app.route('/parse', methods=['POST'])
def parse_build():
    """API endpoint для парсинга билда"""
    try:
        data = request.get_json()
        build_code = data.get('build_code', '').strip()

        if not build_code:
            return jsonify({'error': 'Код билда не предоставлен'}), 400

        # Парсим билд
        parser = PoBParser(build_code)
        parser.parse()

        # Получаем все данные
        all_data = parser.get_all_data()

        return jsonify({
            'success': True,
            'data': all_data
        })

    except ValueError as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400
    except Exception as e:
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': f'Неожиданная ошибка: {str(e)}'
        }), 500


if __name__ == '__main__':
    print("=" * 80)
    print("PoE Build Converter - Web Interface")
    print("=" * 80)
    print("\nЗапуск сервера на http://localhost:5000")
    print("Откройте браузер и перейдите по адресу выше\n")
    print("=" * 80)
    app.run(debug=True, host='0.0.0.0', port=5000)
