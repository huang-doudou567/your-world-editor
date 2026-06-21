# -*- coding: utf-8 -*-
"""
你的世界编辑器 · 模式聚类引擎

从碎片化的流水账中识别跨事件模式：
  1. 主题聚类 — 同主题事件自动归组
  2. 周期性检测 — 重复出现的情绪/行为模式（如"每周四情绪最差"）
  3. 触发链分析 — A 事件 → B 反应 的因果链
  4. 主动洞察生成 — 不需要用户问，算出来后告诉 Agent

设计原则：纯 Python 做确定性脏活（聚类、统计），Agent 做语义理解和洞察表达。
"""

from __future__ import annotations

import re
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from models import Event, Pattern


# ── 主题聚类 ──────────────────────────────────────────────────────

def extract_topic_words(entries: list[dict], top_n: int = 30) -> list[tuple[str, int]]:
    """从事件条目中提取高频主题词（排除停用词）。"""
    stopwords = {
        "今天", "昨天", "早上", "下午", "晚上", "觉得", "感觉", "有点",
        "一个", "这个", "那个", "什么", "怎么", "为什么", "因为", "所以",
        "可以", "应该", "可能", "已经", "还是", "但是", "不过", "然后",
        "真的", "其实", "比较", "特别", "非常", "就是", "没有", "不是",
        "一下", "一次", "一下", "一件", "一下", "一点", "一直", "一样",
        "我的", "他的", "她的", "自己", "我们", "他们", "她们",
        "做了", "去了", "说了", "想了", "看了", "吃了",
        "要不要", "不知道", "好像",
    }

    word_counter = Counter()
    for e in entries:
        text = e["title"] + " " + e["text"]
        # 简单分词：中文按常见标点 + 2-4 字组合
        words = re.findall(r'[一-鿿]{2,4}', text)
        for w in words:
            if w not in stopwords:
                word_counter[w] += 1

    return word_counter.most_common(top_n)


def cluster_events_by_topic(
    entries: list[dict],
    min_cluster_size: int = 2,
) -> list[dict]:
    """将事件按共享主题词自动聚类。

    返回 [{"topic": "关键词", "events": [...], "size": N, "date_range": "..."}]
    """
    if len(entries) < min_cluster_size:
        return []

    # 提取每个事件的主题词
    high_freq = set(w for w, c in extract_topic_words(entries, top_n=50))

    event_topics = []
    for e in entries:
        text = (e["title"] + " " + e["text"]).lower()
        e_words = {w for w in high_freq if w.lower() in text}
        event_topics.append((e, e_words))

    # 在共享主题词的事件之间建立边
    clusters = []
    assigned = set()

    for i, (e1, words1) in enumerate(event_topics):
        if i in assigned:
            continue
        if not words1:
            continue

        group = [e1]
        assigned.add(i)

        for j, (e2, words2) in enumerate(event_topics):
            if j in assigned:
                continue
            # 共享至少 2 个主题词 = 同类
            shared = words1 & words2
            if len(shared) >= 2:
                group.append(e2)
                assigned.add(j)

        if len(group) >= min_cluster_size:
            # 确定聚类主题（共享最多的词）
            all_words = Counter()
            for e in group:
                text = (e["title"] + " " + e["text"]).lower()
                for w in high_freq:
                    if w.lower() in text:
                        all_words[w] += 1

            topic_words = [w for w, _ in all_words.most_common(3)]
            dates = sorted([e["timestamp"][:10] for e in group if e["timestamp"]])

            clusters.append({
                "topic": " / ".join(topic_words) if topic_words else "未命名",
                "events": group,
                "size": len(group),
                "date_range": f"{dates[0]} → {dates[-1]}" if len(dates) >= 2 else (dates[0] if dates else "未知"),
                "tags": Counter(e["tag"] for e in group if e["tag"]),
                "modes": Counter(e["mode"] for e in group if e["mode"]),
            })

    clusters.sort(key=lambda c: c["size"], reverse=True)
    return clusters


# ── 周期性检测 ────────────────────────────────────────────────────

def detect_temporal_patterns(entries: list[dict]) -> list[dict]:
    """检测时间维度上的模式：
    - 星期周期性（如每周四情绪最差）
    - 密集爆发期（连续 3 天出现同标签事件）
    - 长期趋势（某盲区 ❌ 出现频率在上升还是下降）

    返回 [{"type": "weekly_dip"|"burst"|"trend"|..., "detail": ...}]
    """
    patterns = []
    if len(entries) < 5:
        return patterns

    # 1. 星期周期性
    weekday_entries = defaultdict(list)
    for e in entries:
        try:
            ts = datetime.strptime(e["timestamp"][:10], "%Y-%m-%d")
            wd = ts.strftime("%A")  # Monday, Tuesday, ...
            # 转中文
            wd_cn = {"Monday": "周一", "Tuesday": "周二", "Wednesday": "周三",
                     "Thursday": "周四", "Friday": "周五", "Saturday": "周六",
                     "Sunday": "周日"}.get(wd, wd)
            weekday_entries[wd_cn].append(e)
        except ValueError:
            pass

    if weekday_entries:
        # 检查是否有某天明显更"重"
        weekday_scores = {}
        for day, day_entries in weekday_entries.items():
            # 加权：模式标签 + 决策标签 = 情绪负载
            score = 0
            score += sum(3 for e in day_entries if e["tag"] == "模式")
            score += sum(2 for e in day_entries if e["tag"] == "决策")
            score += sum(5 for e in day_entries if e["mode"] == "❌")
            weekday_scores[day] = {"score": score, "count": len(day_entries)}

        avg_score = sum(v["score"] for v in weekday_scores.values()) / len(weekday_scores)
        dips = {
            day: info for day, info in weekday_scores.items()
            if info["score"] > avg_score * 1.5  # 1.5 倍标准差
        }
        if dips:
            patterns.append({
                "type": "weekly_dip",
                "week_days": list(dips.keys()),
                "detail": dips,
                "suggestion": f"{'、'.join(dips.keys())} 情绪负载显著高于其他天，建议关注是否有固定触发源",
            })

    # 2. 密集爆发期
    if len(entries) >= 3:
        entries_sorted = sorted(entries, key=lambda e: e["timestamp"])
        burst_start = None
        burst_events = []
        for e in entries_sorted:
            try:
                ts = datetime.strptime(e["timestamp"][:10], "%Y-%m-%d")
                if burst_start is None:
                    burst_start = ts
                    burst_events = [e]
                elif (ts - burst_start).days <= 5 and len(burst_events) < 20:
                    burst_events.append(e)
                else:
                    if len(burst_events) >= 3:
                        # 检查 burst 内的同标签比例
                        tags_in_burst = Counter(e["tag"] for e in burst_events if e["tag"])
                        dominant_tag = tags_in_burst.most_common(1)
                        if dominant_tag and dominant_tag[0][1] >= 3:
                            patterns.append({
                                "type": "burst",
                                "tag": dominant_tag[0][0],
                                "count": len(burst_events),
                                "date_range": f"{burst_start.strftime('%Y-%m-%d')} → {ts.strftime('%Y-%m-%d')}",
                                "suggestion": f"在 {burst_start.strftime('%m/%d')} - {ts.strftime('%m/%d')} 期间出现 {len(burst_events)} 条 [{dominant_tag[0][0]}] 事件，可能存在密集情绪期",
                            })
                    burst_start = ts
                    burst_events = [e]
            except ValueError:
                pass

    # 3. 长期趋势：某 tag 在近 30 天 vs 前 30 天的频率变化
    now = datetime.now()
    recent_30d = []
    prev_30d = []
    for e in entries:
        try:
            ts = datetime.strptime(e["timestamp"][:10], "%Y-%m-%d")
            days_ago = (now - ts).days
            if 0 <= days_ago <= 30:
                recent_30d.append(e)
            elif 31 <= days_ago <= 60:
                prev_30d.append(e)
        except ValueError:
            pass

    if recent_30d and prev_30d:
        recent_count = len(recent_30d)
        prev_count = len(prev_30d)
        if prev_count > 0:
            change = (recent_count - prev_count) / prev_count
            if abs(change) >= 0.3:
                direction = "上升" if change > 0 else "下降"
                patterns.append({
                    "type": "trend",
                    "direction": direction,
                    "change_pct": round(change * 100),
                    "recent_30d": recent_count,
                    "prev_30d": prev_count,
                    "suggestion": f"近 30 天记录频率比前 30 天 {direction} {abs(round(change*100))}%，"
                                  f"{'系统使用在增加' if change > 0 else '可能逐渐疏于记录'}",
                })

    return patterns


def detect_pattern_recurrence(
    patterns: list[dict],
    entries: list[dict],
    recent_days: int = 90,
) -> list[dict]:
    """检测已知盲区在近期的 ❌/✅ 比例变化。

    如果某盲区近期 ❌ 占比下降 → 系统有效。
    如果某盲区近期 ❌ 占比上升 → 需要关注。
    """
    now = datetime.now()
    results = []

    for p in patterns:
        if p["type"] != "blind_spot":
            continue

        recent_neg = 0
        recent_pos = 0
        older_neg = 0
        older_pos = 0

        for case in p.get("cases", []):
            try:
                ts = datetime.strptime(case["timestamp"], "%Y-%m-%d")
                days_ago = (now - ts).days
                if case["symbol"] == "❌":
                    if days_ago <= recent_days:
                        recent_neg += 1
                    else:
                        older_neg += 1
                elif case["symbol"] == "✅":
                    if days_ago <= recent_days:
                        recent_pos += 1
                    else:
                        older_pos += 1
            except (ValueError, KeyError):
                pass

        recent_total = recent_neg + recent_pos
        older_total = older_neg + older_pos

        if recent_total > 0 and older_total > 0:
            recent_rate = recent_neg / recent_total
            older_rate = older_neg / older_total
            trend = recent_rate - older_rate

            results.append({
                "name": p["name"],
                "recent_neg": recent_neg, "recent_pos": recent_pos,
                "older_neg": older_neg, "older_pos": older_pos,
                "recent_recurrence_rate": round(recent_rate, 3),
                "older_recurrence_rate": round(older_rate, 3),
                "trend": round(trend, 3),
                "improving": trend < 0,
                "suggestion": (
                    f"盲区「{p['name']}」近期再现率 {recent_rate:.1%}，比之前 {older_rate:.1%} "
                    f"{'↓ 下降中，系统的识别在起作用' if trend < 0 else '↑ 上升中，需要更多关注'}"
                ),
            })

    results.sort(key=lambda r: abs(r["trend"]), reverse=True)
    return results


# ── 洞察生成主入口 ────────────────────────────────────────────────

def generate_insights(system_dir: Path | str) -> dict:
    """一键生成所有洞察。供 Agent 调用。

    返回结构化的洞察数据，Agent 基于此做自然语言表达。
    """
    from scripts.corpus.store import (
        read_journal_entries, read_patterns, resolve_system_dir,
    )

    system_dir = resolve_system_dir(system_dir) if isinstance(system_dir, str) else system_dir
    system_dir = Path(system_dir)

    entries = read_journal_entries(system_dir)
    patterns = read_patterns(system_dir)

    if not entries:
        return {"status": "empty", "message": "流水账为空，暂无洞察可生成。"}

    # 主题聚类
    topic_clusters = cluster_events_by_topic(entries, min_cluster_size=2)

    # 时间模式
    temporal_patterns = detect_temporal_patterns(entries)

    # 盲区趋势
    recurrence = detect_pattern_recurrence(patterns, entries)

    # 高优先级主题（可用于 merge 提醒）
    merge_candidates = []
    for c in topic_clusters:
        # 3+ 事件且跨 7 天以上的聚类 = merge 候选
        if c["size"] >= 3:
            dates = sorted([e["timestamp"][:10] for e in c["events"] if e["timestamp"]])
            if len(dates) >= 2:
                try:
                    d1 = datetime.strptime(dates[0], "%Y-%m-%d")
                    d2 = datetime.strptime(dates[-1], "%Y-%m-%d")
                    if (d2 - d1).days >= 7 and c["tags"].get("模式", 0) >= 1:
                        merge_candidates.append(c)
                except ValueError:
                    pass

    return {
        "status": "ok",
        "total_entries_analyzed": len(entries),
        "topic_clusters": topic_clusters,
        "temporal_patterns": temporal_patterns,
        "pattern_recurrence_trends": recurrence,
        "merge_candidates": merge_candidates,
        "suggested_action": _generate_suggestion(
            topic_clusters, temporal_patterns, recurrence, merge_candidates
        ),
        "generated_at": datetime.now().isoformat(),
    }


def _generate_suggestion(
    topic_clusters: list,
    temporal_patterns: list,
    recurrence: list,
    merge_candidates: list,
) -> str:
    """生成一句话行动建议。"""
    suggestions = []

    if merge_candidates:
        c = merge_candidates[0]
        suggestions.append(
            f"「{c['topic']}」相关事件已达 {c['size']} 条，建议 merge 进叙事层"
        )

    improving = [r for r in recurrence if r["improving"]]
    worsening = [r for r in recurrence if not r["improving"]]
    if worsening:
        suggestions.append(
            f"盲区「{worsening[0]['name']}」近期再现率上升，本周复盘时重点关注"
        )
    if improving:
        suggestions.append(
            f"盲区「{improving[0]['name']}」再现率持续下降，进步可见"
        )

    if temporal_patterns:
        patterns = [p for p in temporal_patterns if p["type"] == "weekly_dip"]
        if patterns:
            suggestions.append(patterns[0]["suggestion"])

    return "；".join(suggestions) if suggestions else "暂无特别建议，保持当前节奏。"
