#!/usr/bin/env python3
"""
arXiv 论文搜索脚本

使用 arXiv API 搜索学术论文并返回结果。
"""

import argparse
import sys
import urllib.request
import xml.etree.ElementTree as ET


def search_arxiv(query: str, max_results: int = 10) -> str:
    """
    搜索 arXiv 论文

    Args:
        query: 搜索查询字符串
        max_results: 最大返回结果数

    Returns:
        JSON 格式的搜索结果
    """
    # 构建 arXiv API URL
    base_url = "http://export.arxiv.org/api/query"
    params = f"?search_query=all:{query}&max_results={max_results}"
    url = base_url + params

    try:
        with urllib.request.urlopen(url) as response:
            xml_data = response.read().decode('utf-8')

        # 解析 XML 响应
        root = ET.fromstring(xml_data)

        # arXiv API 使用命名空间
        ns = {
            'atom': 'http://www.w3.org/2005/Atom',
            'arxiv': 'http://arxiv.org/schemas/atom'
        }

        results = []
        for entry in root.findall('atom:entry', ns):
            title = entry.find('atom:title', ns).text.strip()
            summary = entry.find('atom:summary', ns).text.strip()
            # 获取作者
            authors = []
            for author in entry.findall('atom:author', ns):
                name = author.find('atom:name', ns).text
                authors.append(name)
            # 获取链接
            links = entry.findall('atom:link', ns)
            pdf_url = None
            for link in links:
                if link.get('type') == 'application/pdf':
                    pdf_url = link.get('href')
                    break
            # 获取 arXiv ID
            id_text = entry.find('atom:id', ns).text
            arxiv_id = id_text.split('/').pop()

            results.append({
                'id': arxiv_id,
                'title': title,
                'authors': authors,
                'summary': summary,
                'pdf_url': pdf_url
            })

        import json
        return json.dumps({
            'query': query,
            'count': len(results),
            'results': results
        }, ensure_ascii=False, indent=2)

    except Exception as e:
        import json
        return json.dumps({
            'error': str(e),
            'query': query
        }, ensure_ascii=False)


def main():
    parser = argparse.ArgumentParser(description='搜索 arXiv 学术论文')
    parser.add_argument('--query', required=True, help='搜索查询')
    parser.add_argument('--max-results', type=int, default=10, help='最大结果数')

    args = parser.parse_args()

    result = search_arxiv(args.query, args.max_results)
    print(result)


if __name__ == '__main__':
    main()
