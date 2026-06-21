# -*- coding: utf-8 -*-
"""
你的世界编辑器 · 存储层

负责三层 Markdown 文件的读写、搜索、事件追加、模式同步和叙事 merge。
所有操作以文本行为单位，兼容已有的 Markdown 格式。
"""

from __future__ import annotations

import re
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from models import Event, Pattern, Decision, WeeklyReview


# ── 路径解析 ──────────────────────────────────────────────────────

def resolve_system_dir(base_dir: str | Path = ".") -> Path:
    """找到人生系统目录。"""
    base = Path(base_dir).resolve()
    # 先找当前目录下的 人生系统/
    candidate = base / "人生系统"
    if candidate.exists():
        return candidate
    # 再找用户桌面
    desktop_candidate = Path.home() / "Desktop" / "人生系统"
    if desktop_candidate.exists():
        return desktop_candidate
    # 最后找 Documents
    docs_candidate = Path.home() / "Documents" / "人生系统"
    if docs_candidate.exists():
        return docs_candidate
    return candidate  # 返回默认路径（不存在也返回）


def get_journal_path(system_dir: Path) -> Path:
    return system_dir / "事件" / "经历流水账.md"

def get_pattern_path(system_dir: Path) -> Path:
    return system_dir / "模式" / "模式与盲点.md"

def get_story_path(system_dir: Path) -> Path:
    return system_dir / "叙事" / "我的故事.md"

def get_review_dir(system_dir: Path) -> Path:
    return system_dir / "复盘"

def get_dream_path(system_dir: Path) -> Path:
    return system_dir / "梦境" / "dreams.md"


# ── 读取 ──────────────────────────────────────────────────────────

def read_file(path: Path) -> str:
    """读取文件全文。不存在返回空字符串。"""
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8")

def read_journal_entries(system_dir: Path) -> list[dict]:
    """从经历流水账中解析出所有事件条目。

    返回 [{timestamp, tag, mode, title, text, merged, raw_lines}]
    """
    path = get_journal_path(system_dir)
    content = read_file(path)
    if not content:
        return []

    entries = []
    # 匹配格式：YYYY-MM-DD · [标签] 标题  或  YYYY-MM-DD · ❌ 标题
    entry_pattern = re.compile(
        r'^(\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2})?)\s*·\s*'
        r'(?:\[([^\]]*)\]\s*)?'
        r'(?:([❌✅])\s*)?'
        r'(.+)$'
    )

    lines = content.split('\n')
    current_entry = None

    for line in lines:
        m = entry_pattern.match(line.strip())
        if m:
            if current_entry:
                entries.append(current_entry)
            ts, tag, mode, title = m.groups()
            current_entry = {
                "timestamp": ts.strip(),
                "tag": (tag or "").strip(),
                "mode": (mode or "").strip(),
                "title": title.strip(),
                "text": "",
                "merged": "merged" in line.lower() and "✅" in line,
                "raw_lines": [line],
            }
        elif current_entry:
            current_entry["raw_lines"].append(line)
            current_entry["text"] += line + "\n"

    if current_entry:
        entries.append(current_entry)

    # 清理 text 尾部空白
    for e in entries:
        e["text"] = e["text"].strip()
        # 检查末尾是否有 ✅ merged
        if "✅ merged" in e["text"] or "✅merged" in e["text"]:
            e["merged"] = True

    return entries


def read_patterns(system_dir: Path) -> list[dict]:
    """从模式与盲点.md 中解析出所有模式条目。"""
    path = get_pattern_path(system_dir)
    content = read_file(path)
    if not content:
        return []

    patterns = []
    # 匹配 ### 模式名
    section_pattern = re.compile(r'^###\s+(.+)$')
    # 匹配 **核心模式** / **根源** 等字段
    field_pattern = re.compile(r'^\*\*(.+?)\*\*[:：]\s*(.*)$')
    # 匹配案例日志 ❌/✅
    case_pattern = re.compile(r'^[-*]\s*([❌✅])\s*(\d{4}-\d{2}-\d{2})\s*(.+)$')
    # 匹配书摘
    bq_pattern = re.compile(r'^[-*]\s*\(([❌✅通用]+)\)\s*[「「](.+)[」」]\s*——[《「](.+)[》」]$')

    current_pattern = None
    current_section = ""
    in_cases = False
    in_bookquotes = False

    for line in content.split('\n'):
        line_stripped = line.strip()

        # 大节标题
        if line_stripped.startswith('## 一、') or line_stripped.startswith('## 二、'):
            if current_pattern:
                patterns.append(current_pattern)
            current_pattern = None
            current_section = "positive" if "正向" in line_stripped else "blind_spot"
            continue

        if line_stripped.startswith('## 三、'):
            if current_pattern:
                patterns.append(current_pattern)
            current_pattern = None
            current_section = "emotion_map"
            continue

        # 模式条目
        m = section_pattern.match(line_stripped)
        if m and current_section in ("positive", "blind_spot"):
            if current_pattern:
                patterns.append(current_pattern)
            current_pattern = {
                "name": m.group(1).strip(),
                "type": current_section if current_section == "positive" else "blind_spot",
                "trigger": "", "core": "", "root_cause": "",
                "countermeasure": "", "source": "observed",
                "confidence": "medium",
                "emotional_triggers": [],
                "bookquotes": [],
                "cases": [],
            }
            in_cases = False
            in_bookquotes = False
            continue

        if not current_pattern:
            continue

        # 案例日志标记
        if "案例日志" in line_stripped:
            in_cases = True
            in_bookquotes = False
            continue

        # 书摘标记
        if "📖" in line_stripped and "书摘" in line_stripped:
            in_bookquotes = True
            in_cases = False
            continue

        # 案例行
        if in_cases:
            cm = case_pattern.match(line_stripped)
            if cm:
                current_pattern["cases"].append({
                    "symbol": cm.group(1),
                    "timestamp": cm.group(2),
                    "description": cm.group(3).strip(),
                    "bookquote": None,
                })
            continue

        # 书摘行
        if in_bookquotes:
            bm = bq_pattern.match(line_stripped)
            if bm:
                current_pattern["bookquotes"].append({
                    "type": bm.group(1).strip(),
                    "text": bm.group(2).strip(),
                    "source": bm.group(3).strip(),
                })
            continue

        # 键值字段
        fm = field_pattern.match(line_stripped)
        if fm:
            key = fm.group(1).strip()
            value = fm.group(2).strip()
            key_map = {
                "核心模式": "core", "规律": "core",
                "根源": "root_cause",
                "对策": "countermeasure",
                "触发": "trigger", "触发情境": "trigger",
                "真实情况": "root_cause",
            }
            if key in key_map:
                current_pattern[key_map[key]] = value
            continue

    if current_pattern:
        patterns.append(current_pattern)

    return patterns


def read_story_sections(system_dir: Path) -> dict[str, str]:
    """读取我的故事.md 各章节内容。"""
    path = get_story_path(system_dir)
    content = read_file(path)
    if not content:
        return {}

    sections = {}
    current_section = "开篇"
    current_text = []

    section_pattern = re.compile(r'^##\s+(.+)$')

    for line in content.split('\n'):
        m = section_pattern.match(line.strip())
        if m:
            if current_text:
                sections[current_section] = '\n'.join(current_text).strip()
            current_section = m.group(1).strip()
            current_text = []
        else:
            current_text.append(line)

    if current_text:
        sections[current_section] = '\n'.join(current_text).strip()

    return sections


# ── 写入 ──────────────────────────────────────────────────────────

def append_journal_entry(
    system_dir: Path,
    event: Event,
    bookquote: str | None = None,
) -> None:
    """向流水账顶部追加一条新事件。"""
    path = get_journal_path(system_dir)
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        path.write_text(
            "---\ndate: " + datetime.now().strftime("%Y-%m-%d") + "\n---\n\n"
            "# 经历流水账\n\n> 事情发生时随手记，不用整理。新的在上面，倒序。\n\n---\n\n## 记录\n\n",
            encoding="utf-8",
        )

    content = path.read_text(encoding="utf-8")

    # 构建条目
    entry_lines = []
    tag_str = f"[{event.tag}] " if event.tag else ""
    mode_str = f"{event.mode} " if event.mode else ""
    title_line = f"{event.timestamp} · {tag_str}{mode_str}{event.title}"
    entry_lines.append(title_line)
    if event.text:
        entry_lines.append(event.text)
    if bookquote:
        entry_lines.append(f"  📖 {bookquote}")
    if event.pattern_refs:
        entry_lines.append(f"  关联: {', '.join(event.pattern_refs)}")
    entry_lines.append("")

    entry_block = '\n'.join(entry_lines)

    # 找到 "## 记录" 标题，在下面插入
    if "## 记录" in content:
        insert_pos = content.index("## 记录") + len("## 记录")
        # 找到下一个换行
        nl = content.index('\n', insert_pos) if '\n' in content[insert_pos:] else len(content)
        new_content = content[:nl+1] + '\n' + entry_block + content[nl+1:]
    else:
        # 追加到末尾
        new_content = content + '\n' + entry_block

    path.write_text(new_content, encoding="utf-8")


def sync_pattern_case(
    system_dir: Path,
    pattern_name: str,
    symbol: str,  # ❌ or ✅
    timestamp: str,
    description: str,
    bookquote: str | None = None,
) -> bool:
    """向模式与盲点.md 中指定条目的案例日志追加一行。

    返回 True 表示成功，False 表示条目未找到。
    """
    path = get_pattern_path(system_dir)
    if not path.exists():
        return False

    content = path.read_text(encoding="utf-8")
    lines = content.split('\n')

    # 找到该条目
    target_idx = None
    for i, line in enumerate(lines):
        if line.strip().startswith('### ') and pattern_name in line:
            target_idx = i
            break

    if target_idx is None:
        return False

    # 找到该条目下的「案例日志」行
    case_section_idx = None
    for i in range(target_idx, len(lines)):
        if '案例日志' in lines[i]:
            case_section_idx = i
            break

    if case_section_idx is None:
        # 没有案例日志节，在条目末尾插入
        # 找到下一个 ### 或者 ##
        insert_idx = len(lines)
        for i in range(target_idx + 1, len(lines)):
            if lines[i].strip().startswith('### ') or lines[i].strip().startswith('## '):
                insert_idx = i
                break
        case_line = f"\n**案例日志**：\n- {symbol} {timestamp} {description}"
        if bookquote:
            case_line += f"\n  📖 {bookquote}"
        lines.insert(insert_idx, case_line + "\n")
    else:
        case_line = f"- {symbol} {timestamp} {description}"
        if bookquote:
            case_line += f"\n  📖 {bookquote}"
        # 在案例日志标题后插入
        lines.insert(case_section_idx + 1, case_line)

    path.write_text('\n'.join(lines), encoding="utf-8")
    return True


def merge_to_story(
    system_dir: Path,
    section: str,
    text: str,
    events: list[Event],
) -> None:
    """将一组事件 merge 进我的故事.md 指定章节。"""
    path = get_story_path(system_dir)
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        path.write_text(
            "---\ndate: " + datetime.now().strftime("%Y-%m-%d") + "\n---\n\n"
            "# 我的故事\n\n> 关于「我是谁」的叙事主库。这是图书馆，不是收件箱。\n\n",
            encoding="utf-8",
        )

    content = path.read_text(encoding="utf-8")

    merge_text = f"\n\n> 于 {datetime.now().strftime('%Y-%m-%d')} merge\n\n{text}\n"

    # 找到对应章节
    section_pattern = re.compile(rf'^##\s+{re.escape(section)}\s*$', re.MULTILINE)
    m = section_pattern.search(content)
    if m:
        # 找到下一节或末尾
        next_section = re.search(r'^##\s+', content[m.end():], re.MULTILINE)
        if next_section:
            insert_pos = m.end() + next_section.start()
        else:
            insert_pos = len(content)
        new_content = content[:insert_pos] + merge_text + content[insert_pos:]
    else:
        # 章节不存在，追加
        new_content = content + f"\n\n## {section}\n{merge_text}\n"

    path.write_text(new_content, encoding="utf-8")

    # 在流水账中标记对应事件为 merged
    journal_path = get_journal_path(system_dir)
    if journal_path.exists():
        journal = journal_path.read_text(encoding="utf-8")
        for e in events:
            if e.title and not e.merged:
                journal = journal.replace(
                    f"{e.title}\n{e.text}",
                    f"{e.title}\n{e.text}\n✅ merged",
                )
        journal_path.write_text(journal, encoding="utf-8")


def write_weekly_review(system_dir: Path, review: WeeklyReview) -> Path:
    """保存周复盘到文件。"""
    review_dir = get_review_dir(system_dir)
    review_dir.mkdir(parents=True, exist_ok=True)
    path = review_dir / f"{review.week_label}.json"
    path.write_text(
        json.dumps(review.to_dict(), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return path


# ── 搜索 ──────────────────────────────────────────────────────────

def search_entries(
    system_dir: Path,
    query: str,
    top_n: int = 10,
    days_back: int = 0,
) -> list[dict]:
    """在流水账中搜索与 query 相关的条目。

    先用关键词匹配（快速），再按语义相关性排序。
    days_back=0 表示不限时间范围。
    """
    entries = read_journal_entries(system_dir)
    if not entries:
        return []

    query_lower = query.lower()
    now = datetime.now()

    scored = []
    for e in entries:
        # 时间过滤
        if days_back > 0:
            try:
                ts = datetime.strptime(e["timestamp"][:10], "%Y-%m-%d")
                if (now - ts).days > days_back:
                    continue
            except ValueError:
                pass

        # 多维度打分
        score = 0
        text_lower = (e["title"] + " " + e["text"] + " " + e["tag"]).lower()

        # 完全匹配加分
        if query_lower in text_lower:
            score += 10
            # 标题命中额外加分
            if query_lower in e["title"].lower():
                score += 5

        # 关键词部分匹配
        query_words = query_lower.split()
        for word in query_words:
            if len(word) >= 2:  # 忽略单字
                if word in text_lower:
                    score += 3
                # tag 命中
                if word in e["tag"].lower():
                    score += 2

        # 近期事件加权
        try:
            ts = datetime.strptime(e["timestamp"][:10], "%Y-%m-%d")
            recency_days = (now - ts).days
            if recency_days <= 7:
                score += 5
            elif recency_days <= 30:
                score += 3
            elif recency_days <= 90:
                score += 1
        except ValueError:
            pass

        if score > 0:
            scored.append({**e, "score": score})

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:top_n]


def find_related_entries(
    system_dir: Path,
    topic_words: list[str],
    days_back: int = 90,
) -> list[dict]:
    """找出与一组主题词相关的事件，用于聚类分析。"""
    entries = read_journal_entries(system_dir)
    if not entries:
        return []

    now = datetime.now()
    related = []

    for e in entries:
        if days_back > 0:
            try:
                ts = datetime.strptime(e["timestamp"][:10], "%Y-%m-%d")
                if (now - ts).days > days_back:
                    continue
            except ValueError:
                pass

        text = (e["title"] + " " + e["text"] + " " + e["tag"]).lower()
        hits = sum(1 for w in topic_words if w.lower() in text)
        if hits >= 2:
            related.append({**e, "topic_hits": hits})

    related.sort(key=lambda x: x["topic_hits"], reverse=True)
    return related


# ── 统计 ──────────────────────────────────────────────────────────

def get_system_stats(system_dir: Path) -> dict:
    """获取系统使用统计，用于评估。"""
    entries = read_journal_entries(system_dir)
    patterns = read_patterns(system_dir)
    story = read_story_sections(system_dir)

    now = datetime.now()

    # 基本统计
    total_entries = len(entries)
    tagged_entries = len([e for e in entries if e["tag"]])
    pattern_entries = len([e for e in entries if e["tag"] == "模式"])
    decision_entries = len([e for e in entries if e["tag"] == "决策"])
    insight_entries = len([e for e in entries if e["tag"] == "洞察"])

    # 盲区统计
    blind_spot_patterns = [p for p in patterns if p["type"] == "blind_spot"]
    total_neg_cases = sum(
        len([c for c in p["cases"] if c["symbol"] == "❌"])
        for p in patterns
    )
    total_pos_cases = sum(
        len([c for c in p["cases"] if c["symbol"] == "✅"])
        for p in patterns
    )

    # 盲区再现率 = ❌ / (❌ + ✅)，如果近期❌比例在下降说明系统有效
    blind_spot_recurrence = (
        total_neg_cases / (total_neg_cases + total_pos_cases)
        if (total_neg_cases + total_pos_cases) > 0
        else 0
    )

    # 最近 30 天活跃天数（不同日期）和最长断档
    active_dates = set()
    for e in entries:
        try:
            ts = datetime.strptime(e["timestamp"][:10], "%Y-%m-%d")
            days_ago = (now - ts).days
            if 0 <= days_ago <= 30:
                active_dates.add(ts.strftime("%Y-%m-%d"))
        except ValueError:
            pass

    active_days_30d = len(active_dates)

    # 计算最长断档：从今天往回看，两次记录之间最大的间隔
    all_dates = set()
    for e in entries:
        try:
            all_dates.add(datetime.strptime(e["timestamp"][:10], "%Y-%m-%d").strftime("%Y-%m-%d"))
        except ValueError:
            pass
    sorted_dates = sorted(all_dates)

    # 最长断档 = 从最早日期到今天之间，相邻记录日期的最大间隔
    if len(sorted_dates) >= 2:
        max_gap = 0
        for i in range(1, len(sorted_dates)):
            d1 = datetime.strptime(sorted_dates[i-1], "%Y-%m-%d")
            d2 = datetime.strptime(sorted_dates[i], "%Y-%m-%d")
            gap = (d2 - d1).days
            if gap > max_gap:
                max_gap = gap
        # 也看看最近一次记录到今天的 gap
        last_date = datetime.strptime(sorted_dates[-1], "%Y-%m-%d")
        gap_to_today = (now - last_date).days
        longest_gap = max(max_gap, gap_to_today)
    elif len(sorted_dates) == 1:
        last_date = datetime.strptime(sorted_dates[0], "%Y-%m-%d")
        longest_gap = (now - last_date).days
    else:
        longest_gap = 30  # 无记录，默认30天断档

    # merge 率
    merged_count = len([e for e in entries if e["merged"]])

    return {
        "total_entries": total_entries,
        "tagged_entries": tagged_entries,
        "pattern_entries": pattern_entries,
        "decision_entries": decision_entries,
        "insight_entries": insight_entries,
        "total_patterns": len(patterns),
        "blind_spot_patterns": len(blind_spot_patterns),
        "positive_patterns": len([p for p in patterns if p["type"] == "positive"]),
        "total_cases_neg": total_neg_cases,
        "total_cases_pos": total_pos_cases,
        "blind_spot_recurrence": round(blind_spot_recurrence, 3),
        "active_days_30d": active_days_30d,
        "longest_gap_days": longest_gap,
        "recent_30d_entries": active_days_30d,  # 向后兼容
        "merged_count": merged_count,
        "merge_rate": round(merged_count / total_entries, 3) if total_entries else 0,
        "story_sections": len(story),
        "generated_at": now.isoformat(),
    }
