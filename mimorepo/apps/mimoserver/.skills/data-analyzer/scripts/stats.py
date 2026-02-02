#!/usr/bin/env python3
"""
数据分析脚本 - 计算基础统计信息
"""

import argparse
import json
import sys


def calculate_stats(data):
    """计算数组的统计信息"""
    if not data:
        return {'error': 'Empty data'}

    n = len(data)
    data_sorted = sorted(data)

    return {
        'count': n,
        'mean': sum(data) / n,
        'median': data_sorted[n // 2] if n % 2 == 1 else (data_sorted[n // 2 - 1] + data_sorted[n // 2]) / 2,
        'min': min(data),
        'max': max(data),
        'sum': sum(data),
        'range': max(data) - min(data)
    }


def main():
    parser = argparse.ArgumentParser(description='计算数据统计信息')
    parser.add_argument('--data', help='JSON 数组字符串，如 "[1,2,3,4,5]"')
    parser.add_argument('--file', help='包含数据的文件路径')
    parser.add_argument('--column', help='CSV 文件中的列名')

    args = parser.parse_args()

    # 处理直接输入的数据
    if args.data:
        try:
            data = json.loads(args.data)
            if not isinstance(data, list):
                print(json.dumps({'error': 'Data must be an array'}))
                return
            result = calculate_stats(data)
            print(json.dumps(result, indent=2))
        except json.JSONDecodeError:
            print(json.dumps({'error': 'Invalid JSON format'}))

    # 处理文件输入
    elif args.file:
        try:
            with open(args.file, 'r') as f:
                content = f.read()

            # 判断文件类型
            if args.file.endswith('.json'):
                data = json.loads(content)
                if isinstance(data, list):
                    result = calculate_stats(data)
                    print(json.dumps(result, indent=2))
                elif isinstance(data, dict) and args.column:
                    if args.column in data:
                        result = calculate_stats(data[args.column])
                        print(json.dumps(result, indent=2))
                    else:
                        print(json.dumps({'error': f'Column {args.column} not found'}))

            elif args.file.endswith('.csv'):
                import csv
                reader = csv.DictReader(content.splitlines())
                if args.column:
                    data = [float(row[args.column]) for row in reader if row[args.column]]
                    result = calculate_stats(data)
                    print(json.dumps(result, indent=2))
                else:
                    print(json.dumps({'error': 'Please specify --column for CSV files'}))
        except FileNotFoundError:
            print(json.dumps({'error': f'File not found: {args.file}'}))
        except Exception as e:
            print(json.dumps({'error': str(e)}))

    else:
        print(json.dumps({'error': 'Please provide --data or --file'}))


if __name__ == '__main__':
    main()
