#!/usr/bin/env python3
"""
天气查询脚本

提供模拟天气数据查询功能（生产环境应接入真实天气API）
"""

import argparse
import json


# 模拟天气数据库
MOCK_WEATHER_DATA = {
    "beijing": {
        "city": "Beijing",
        "city_zh": "北京",
        "temperature": 22,
        "humidity": 45,
        "wind_speed": 12,
        "condition": "Clear",
        "description": "晴朗"
    },
    "shanghai": {
        "city": "Shanghai",
        "city_zh": "上海",
        "temperature": 26,
        "humidity": 72,
        "wind_speed": 8,
        "condition": "Cloudy",
        "description": "多云"
    },
    "london": {
        "city": "London",
        "city_zh": "伦敦",
        "temperature": 15,
        "humidity": 80,
        "wind_speed": 20,
        "condition": "Rainy",
        "description": "小雨"
    },
    "newyork": {
        "city": "New York",
        "city_zh": "纽约",
        "temperature": 18,
        "humidity": 60,
        "wind_speed": 15,
        "condition": "Partly Cloudy",
        "description": "局部多云"
    },
    "tokyo": {
        "city": "Tokyo",
        "city_zh": "东京",
        "temperature": 24,
        "humidity": 55,
        "wind_speed": 10,
        "condition": "Clear",
        "description": "晴朗"
    },
    "paris": {
        "city": "Paris",
        "city_zh": "巴黎",
        "temperature": 17,
        "humidity": 65,
        "wind_speed": 12,
        "condition": "Cloudy",
        "description": "阴天"
    }
}


def get_weather(city: str, units: str = "metric") -> dict:
    """
    获取城市天气信息

    Args:
        city: 城市名称（支持中英文）
        units: 单位制 (metric/imperial)

    Returns:
        天气信息字典
    """
    city_key = city.lower().replace(" ", "")
    city_key = city_key.replace("纽约", "newyork")

    if city_key in MOCK_WEATHER_DATA:
        weather = MOCK_WEATHER_DATA[city_key].copy()

        # 单位转换
        if units == "imperial":
            # 摄氏度转华氏度
            weather["temperature"] = weather["temperature"] * 9/5 + 32
            weather["units"] = "imperial"
        else:
            weather["units"] = "metric"

        return {
            "success": True,
            "data": weather
        }
    else:
        return {
            "success": False,
            "error": f"City '{city}' not found. Available cities: {', '.join(MOCK_WEATHER_DATA.keys())}"
        }


def main():
    parser = argparse.ArgumentParser(description='查询城市天气')
    parser.add_argument('--city', required=True, help='城市名称')
    parser.add_argument('--units', default='metric', choices=['metric', 'imperial'], help='单位制')

    args = parser.parse_args()

    result = get_weather(args.city, args.units)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
