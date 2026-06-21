# -*- coding: utf-8 -*-
"""
你的世界编辑器 · 评估指标

回答「这个系统真的帮到用户了吗」。
评估维度：
  1. 系统使用健康度 — 用户在用吗？频次够吗？
  2. 盲区改善度 — 盲区再现率在下降吗？
  3. 决策质量 — 用户对自己决策的满意度有提升吗？
  4. 叙事沉淀率 — 碎片在变成书吗？
"""

from __future__ import annotations

from datetime import datetime
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from models import Event, Pattern, Decision


def compute_health_score(stats: dict) -> dict:
    """系统使用健康度评分。

    三个维度：
    - 日活跃度（60%）：近 30 天有多少个不同的天有记录。不只看总数——一天写 30 条不算健康。
    - 标签化率（25%）：多大比例的事件打了标签。愿意打标签说明不是随便写写。
    - 连续性（15%）：最长连续断档天数。断超过 7 天扣分，断超过 30 天说明基本弃用。
    """
    total = stats.get("total_entries", 0)
    active_days = stats.get("active_days_30d", 0)       # 多少个不同日期有记录
    longest_gap = stats.get("longest_gap_days", 30)      # 最长断档天数
    tagged = stats.get("tagged_entries", 0)

    if total == 0:
        return {
            "dimension": "系统使用健康度",
            "score": 0,
            "level": "未启动",
            "details": {
                "近30天活跃天数": "0/30",
                "标签化比例": "0%",
                "最长断档": "N/A",
                "总事件数": 0,
            },
            "suggestion": "还从未记录过任何事件。说「记一下」开始第一笔吧。",
        }

    # 一、日活跃度：不同天 / 30，理想 ≥ 0.5（15 个不同天）
    day_ratio = min(active_days / 30, 1.0)

    # 二、标签化率：有 tag 的条目占比，理想 ≥ 0.5
    tag_ratio = tagged / total

    # 三、连续性：断档越短越好。> 30 天直接 0 分，< 3 天满分
    if longest_gap <= 3:
        continuity_score = 1.0
    elif longest_gap <= 7:
        continuity_score = 0.8
    elif longest_gap <= 14:
        continuity_score = 0.5
    elif longest_gap <= 30:
        continuity_score = 0.2
    else:
        continuity_score = 0

    # 加权
    score = (day_ratio * 0.6 + tag_ratio * 0.25 + continuity_score * 0.15) * 100

    if score >= 65:
        level = "优秀"
    elif score >= 50:
        level = "良好"
    elif score >= 30:
        level = "一般"
    else:
        level = "偏低"

    # 分级建议
    if score >= 65:
        suggestion = "系统使用频率和深度都很好，保持这个节奏。"
    elif score >= 50:
        suggestion = "整体不错。"
        if day_ratio < 0.5:
            suggestion += "可以试着提高记录频次——不用每天长篇，睡前一句话就够。"
        if tag_ratio < 0.5:
            suggestion += "试着多打标签（[决策]/[模式]/[洞察]），标签越多模式识别越准。"
        if continuity_score < 0.8:
            suggestion += f"最长断档 {longest_gap} 天，偶尔断几天没关系，别断成习惯。"
    elif score >= 30:
        suggestion = "系统在间歇使用。记录就像健身——频次比单次质量更重要。从「每天睡前记一句今天的关键词」开始，不用写完整句子。"
    else:
        if longest_gap > 30:
            suggestion = f"已经断档 {longest_gap} 天，几乎相当于重新开始了。没关系——说一句「重新启动」就回来了。"
        else:
            suggestion = f"系统使用偏低。记录就像健身——频次比单次强度更重要。建议从「每天睡前记一句」开始。"

    return {
        "dimension": "系统使用健康度",
        "score": round(score, 1),
        "level": level,
        "details": {
            "近30天活跃天数": f"{active_days}/30",
            "日活跃率": f"{day_ratio:.0%}",
            "标签化比例": f"{tag_ratio:.0%}",
            "最长断档": f"{longest_gap} 天",
            "总事件数": total,
            "标签化事件数": tagged,
        },
        "suggestion": suggestion,
    }


def compute_blind_spot_score(recurrence_trends: list[dict]) -> dict:
    """盲区改善度评分。

    核心指标：近期 ❌ / (❌ + ✅) — 越低越好。
    如果有多个盲区在改善 → 系统有效。
    """
    if not recurrence_trends:
        return {
            "dimension": "盲区改善度",
            "score": 0,
            "level": "暂无数据",
            "details": {"评估盲区数": 0},
            "suggestion": "尚无足够案例数据评估盲区改善度。继续记录，积累 10+ 案例后开始有意义。",
        }

    improving = [r for r in recurrence_trends if r["improving"]]
    worsening = [r for r in recurrence_trends if not r["improving"]]

    avg_recurrence = sum(r["recent_recurrence_rate"] for r in recurrence_trends) / len(recurrence_trends)

    # 改善比例
    improve_ratio = len(improving) / len(recurrence_trends)

    score = improve_ratio * 100

    level = "显著改善" if improve_ratio >= 0.7 else ("部分改善" if improve_ratio >= 0.4 else "需要关注")

    return {
        "dimension": "盲区改善度",
        "score": round(score, 1),
        "level": level,
        "details": {
            "评估盲区数": len(recurrence_trends),
            "改善中": len(improving),
            "恶化中": len(worsening),
            "平均再现率": f"{avg_recurrence:.1%}",
        },
        "suggestion": (
            f"{len(improving)}/{len(recurrence_trends)} 个盲区在改善，系统识别正在起作用。"
            if improve_ratio >= 0.7
            else f"{len(worsening)}/{len(recurrence_trends)} 个盲区再现率仍在上升，本周复盘时重点讨论。"
            if worsening
            else "继续积累案例数据。"
        ),
    }


def compute_narrative_score(
    total_entries: int,
    merged_count: int,
    story_sections: int,
) -> dict:
    """叙事沉淀率评分。

    核心指标：碎片变成了书吗？
    - merge 率 < 5%：只是收件箱，还没开始沉淀
    - merge 率 5-15%：有意识在沉淀
    - merge 率 > 15%：系统在真正产出叙事
    """
    merge_rate = merged_count / total_entries if total_entries > 0 else 0

    # merge 率是主指标。story_sections 只做小幅加成（说明至少建了框架）
    score = merge_rate * 100 + min(story_sections * 3, 15) if story_sections >= 2 else merge_rate * 100

    if merge_rate >= 0.15:
        level = "良好沉淀"
    elif merge_rate >= 0.05:
        level = "开始沉淀"
    else:
        level = "积累中"

    return {
        "dimension": "叙事沉淀率",
        "score": round(min(score, 100), 1),
        "level": level,
        "details": {
            "总事件": total_entries,
            "已merge": merged_count,
            "merge率": f"{merge_rate:.1%}",
            "故事章节数": story_sections,
        },
        "suggestion": (
            f"碎片变书的节奏很好（{merge_rate:.0%}），继续沉淀。"
            if merge_rate >= 0.15
            else f"已有 {merged_count} 条事件 merge 进叙事。当某主题积累 3+ 条时会自动提醒 merge。"
            if merged_count > 0
            else "流水账里已经有值得沉淀的内容了——下次说「merge 一下」试试。"
        ),
    }


def generate_eval_report(system_dir: Path | str) -> dict:
    """生成完整的系统评估报告。"""
    from scripts.corpus.store import (
        get_system_stats, resolve_system_dir,
    )
    from scripts.corpus.pattern_cluster import generate_insights

    system_dir = Path(system_dir) if not isinstance(system_dir, Path) else system_dir

    stats = get_system_stats(system_dir)
    insights = generate_insights(system_dir)

    health = compute_health_score(stats)
    blind_spot = compute_blind_spot_score(insights.get("pattern_recurrence_trends", []))
    narrative = compute_narrative_score(
        stats["total_entries"], stats["merged_count"], stats["story_sections"]
    )

    overall = (health["score"] + blind_spot["score"] + narrative["score"]) / 3

    return {
        "generated_at": datetime.now().isoformat(),
        "overall_score": round(overall, 1),
        "overall_level": (
            "系统运转良好" if overall >= 60
            else "系统在正常运转" if overall >= 40
            else "系统需要更多投入"
        ),
        "dimensions": [health, blind_spot, narrative],
        "stats": stats,
    }
