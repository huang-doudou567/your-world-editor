# -*- coding: utf-8 -*-
"""
你的世界编辑器 · 智能事件接入

从用户自然对话中判断「是否值得结构化记录」——不再只靠触发词。
Agent 调用此模块后拿到结构化建议，再决定是否写入流水账。

设计原则：
  - 纯 Python 做确定性判断（分数计算、关键词匹配、标签推测）
  - Agent 做语义判断（最终决定是否真的值得记、怎么表达）
"""

from __future__ import annotations

import re
from datetime import datetime
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from models import Event


# ── 信号打分 ──────────────────────────────────────────────────────

# 高信号词：用户说了这些，大概率值得记
HIGH_SIGNAL_WORDS = {
    # 决策信号
    "决定了": ("决策", 8), "选择了": ("决策", 8), "放弃了": ("决策", 7),
    "接不接": ("决策", 9), "要不要": ("决策", 8), "该不该": ("决策", 8),
    "选A": ("决策", 6), "选B": ("决策", 6),
    "拒绝": ("决策", 7), "拒了": ("决策", 7), "不去了": ("决策", 7),
    # 模式信号（自我觉察）
    "又开始了": ("模式", 9), "又犯了": ("模式", 9), "还是那样": ("模式", 7),
    "我怎么老是": ("模式", 10), "又踩坑了": ("模式", 9),
    "这次没": ("模式", 7), "突破了": ("模式", 8), "居然没": ("模式", 7),
    # 洞察信号
    "想清楚了一件事": ("洞察", 10), "我意识到": ("洞察", 8),
    "原来如此": ("洞察", 6), "想通了": ("洞察", 7),
    "总结一下": ("洞察", 5), "得出一个规律": ("洞察", 8),
    "坚定": ("洞察", 6), "笃定": ("洞察", 6), "确信": ("洞察", 6),
    # 情绪信号（值得记录但不一定打标签）
    "很难过": ("", 5), "特别开心": ("", 5), "特别沮丧": ("", 5),
    "非常焦虑": ("", 5), "特别生气": ("", 5), "很失落": ("", 5),
    "崩溃": ("", 6), "撑不住了": ("", 6), "特别感动": ("", 5),
    "怅然": ("", 5), "怅然若失": ("", 6), "空落落": ("", 5),
    # 事件信号
    "面试了": ("", 7), "拿到offer": ("决策", 9), "被拒了": ("", 7),
    "吵架": ("", 6), "分手": ("决策", 8), "在一起": ("", 7),
    "体检": ("", 6), "生病": ("", 6), "辞职": ("决策", 9),
    "涨薪": ("", 7), "被骂": ("", 6), "被夸": ("", 6),
    "柜员": ("决策", 6), "offer": ("决策", 8), "岗位": ("决策", 5),
}

# 低信号词：用户说了这些也不一定值得记
LOW_SIGNAL_PREFIXES = [
    "你好", "谢谢", "再见", "好的", "嗯", "哦", "行",
    "帮我查", "搜索", "查一下", "什么是", "怎么用",
    "今天天气", "推荐", "建议", "你觉得",
]


def assess_record_worthiness(text: str) -> dict:
    """评估一段自然语言是否值得结构化记录。

    返回 {
        worth_recording: bool,
        score: int,          # 0-20
        suggested_tag: str,  # 建议的标签
        suggested_mode: str, # ❌ / ✅ / ""
        reasons: list[str],  # 为什么建议记/不记
        extracted_title: str, # 自动提取的标题
    }
    """
    text = str(text or "").strip()
    if len(text) < 5:
        return {
            "worth_recording": False,
            "score": 0,
            "suggested_tag": "",
            "suggested_mode": "",
            "reasons": ["文本太短"],
            "extracted_title": "",
        }

    # 排除低信号
    for prefix in LOW_SIGNAL_PREFIXES:
        if text.startswith(prefix):
            return {
                "worth_recording": False,
                "score": 0,
                "suggested_tag": "",
                "suggested_mode": "",
                "reasons": [f"以「{prefix}」开头，可能是功能性对话"],
                "extracted_title": "",
            }

    # 打分
    score = 0
    reasons = []
    tag_hits = {}
    mode_signal = ""

    for word, (tag, word_score) in HIGH_SIGNAL_WORDS.items():
        if word in text:
            score += word_score
            reasons.append(f"命中信号词「{word}」(+{word_score})")
            if tag:
                tag_hits[tag] = tag_hits.get(tag, 0) + word_score
            # 模式词推断 mode
            if "又" in word or "还是" in word or "又踩" in word or "怎么老是" in word:
                mode_signal = "❌"
            elif "突破" in word or "没犯" in word or "居然没" in word or "这次没" in word:
                mode_signal = "✅"

    # 文本长度加分（长文通常更有料）
    if len(text) > 50:
        score += 2
        reasons.append("长文本 (+2)")
    if len(text) > 100:
        score += 2

    # 情绪词但无自我觉察 → 仍值得记录但降分
    has_emotion = any(w in text for w in [
        "难过", "开心", "沮丧", "焦虑", "生气", "失落", "崩溃", "感动"
    ])
    has_self_awareness = any(w in text for w in [
        "我发现", "我意识到", "反思", "总结", "又", "还是", "老是", "总是"
    ])
    if has_emotion and not has_self_awareness:
        score -= 2
        reasons.append("有情绪但无自我觉察 (情绪记录建议降权)")

    # 确定建议标签
    suggested_tag = ""
    if tag_hits:
        suggested_tag = max(tag_hits, key=tag_hits.get)

    # 生成标题
    title = _generate_title(text, suggested_tag)

    return {
        "worth_recording": score >= 4,
        "score": min(score, 20),
        "suggested_tag": suggested_tag,
        "suggested_mode": mode_signal,
        "reasons": reasons,
        "extracted_title": title,
    }


def _generate_title(text: str, tag: str) -> str:
    """从文本中提取一句话标题。"""
    # 取第一句话，去除语气词
    sentences = re.split(r'[。！？\.!\?]', text)
    first = sentences[0].strip() if sentences else text

    # 截断过长标题
    if len(first) > 40:
        # 尝试在标点处截断
        mid = first[:40]
        cut = max(
            mid.rfind('，'), mid.rfind(','),
            mid.rfind(' '), mid.rfind('　'),
        )
        if cut > 10:
            first = first[:cut]

    return first[:50]


# ── 情绪窗格分类 ──────────────────────────────────────────────────

# 彩色窗格关键词
_COLORFUL_KEYWORDS = [
    "开心", "高兴", "兴奋", "温暖", "感恩", "有意义", "值得",
    "顿悟", "灵感", "被理解", "被认可", "成就感", "幸福", "快乐",
    "太棒了", "超好", "惊喜", "感动", "好运", "感谢", "庆祝",
    "原来还可以这样", "想通了", "突破",
    "坚定", "笃定", "确信", "释然", "踏实", "豁然开朗",
]

# 黑暗窗格关键词
_DARK_KEYWORDS = [
    "烦", "累死了", "愤怒", "不满", "失望", "孤独", "无力",
    "害怕", "焦虑", "痛苦", "侮辱", "边界侵犯", "不被理解",
    "伤心", "难过死了", "崩溃", "绝望", "被矮化", "不甘",
    "为什么是我", "凭什么", "忍不了", "受不了", "抑郁",
    "不信任", "被冒犯", "被忽视", "想哭", "失眠",
    "怅然", "怅然若失", "空落落", "迷茫", "不知所措", "恍惚", "失魂落魄",
]

# 自我觉察词（即使有负面情绪，也可能是 insights 而非 pure dark）
_SELF_AWARENESS_MARKERS = [
    "我发现", "我意识到", "反思", "总结", "原来",
    "看清楚", "想明白了", "想通了", "这就是",
]


def classify_emotion(text: str) -> dict:
    """根据文本语义判定情绪窗格。

    Returns:
        {
            "emotion": "colorful" | "bright" | "dark",
            "confidence": "high" | "medium" | "low",
            "reason": "分类依据的一句话说明",
        }

    设计原则：
      - 默认 bright（中性日常），不强行分类
      - 同时命中彩色和黑暗时，取出现次数更多的
      - 有自我觉察标记的黑暗内容仍标 dark，但在 reason 中注明
    """
    colorful_count = sum(1 for kw in _COLORFUL_KEYWORDS if kw in text)
    dark_count = sum(1 for kw in _DARK_KEYWORDS if kw in text)
    has_self_awareness = any(m in text for m in _SELF_AWARENESS_MARKERS)

    # 无明显情感关键词 → 默认明亮
    if colorful_count == 0 and dark_count == 0:
        return {
            "emotion": "bright",
            "confidence": "medium",
            "reason": "未检测到明显情感关键词，默认归入明亮窗格",
        }

    # 彩色 > 黑暗
    if colorful_count > dark_count:
        return {
            "emotion": "colorful",
            "confidence": "high" if colorful_count >= 2 else "medium",
            "reason": f"检测到 {colorful_count} 个积极情感信号",
        }

    # 黑暗 > 彩色
    if dark_count > colorful_count:
        note = ""
        if has_self_awareness:
            note = "（含自我觉察标记——用户可能在深度反思中）"
        return {
            "emotion": "dark",
            "confidence": "high" if dark_count >= 2 else "medium",
            "reason": f"检测到 {dark_count} 个负面情感信号{note}",
        }

    # 打平 → 词语强度决胜（等量时偏保守，默认 bright）
    return {
        "emotion": "bright",
        "confidence": "low",
        "reason": f"彩色和黑暗信号相等（各{colorful_count}个），默认归入明亮窗格",
    }


def classify_emotion_for_agent(text: str) -> str:
    """给 Agent 一个情绪分类建议文本，方便 Agent 在对话中告知用户。"""
    result = classify_emotion(text)
    emoji = {"colorful": "🎨 彩色窗格", "bright": "💡 明亮窗格", "dark": "🌑 黑暗窗格"}
    return f"{emoji[result['emotion']]} · {result['reason']}"


def process_intake(
    text: str,
    system_dir: Path | str,
    auto_confirm: bool = False,
) -> dict:
    """处理用户输入——判断是否值得记录，如果值得就写入。

    auto_confirm=True: 跳过用户确认，直接写入（用于 Agent 判断置信度高时）
    """
    assessment = assess_record_worthiness(text)

    if not assessment["worth_recording"]:
        return {
            "recorded": False,
            "assessment": assessment,
            "message": f"本条不值得结构化记录 (评分 {assessment['score']}/20)。{' '.join(assessment['reasons'])}",
        }

    if not auto_confirm and assessment["score"] < 8:
        # 中置信度——建议 Agent 让用户确认
        return {
            "recorded": False,
            "needs_confirmation": True,
            "assessment": assessment,
            "message": (
                f"检测到可能值得记录的内容 (评分 {assessment['score']}/20)。"
                f"建议标签「{assessment['suggested_tag']}」。"
                f"标题：「{assessment['extracted_title']}」。"
                f"建议让用户确认后再写入。"
            ),
        }

    # 高置信度——直接写入
    from scripts.corpus.store import append_journal_entry, resolve_system_dir

    system_dir = Path(system_dir) if not isinstance(system_dir, Path) else system_dir

    # 情绪窗格分类
    emotion_result = classify_emotion(text)

    event = Event(
        timestamp=datetime.now().strftime("%Y-%m-%d %H:%M"),
        tag=assessment["suggested_tag"],
        mode=assessment["suggested_mode"],
        emotion=emotion_result["emotion"],
        title=assessment["extracted_title"],
        text=text[:500],
        source="free_text",
        confidence="high" if assessment["score"] >= 10 else "medium",
    )
    append_journal_entry(system_dir, event)

    return {
        "recorded": True,
        "assessment": assessment,
        "event": event.to_dict(),
        "message": f"已自动记录：{assessment['extracted_title']} [{assessment['suggested_tag']}]",
    }


def suggest_tag_for_agent(text: str) -> str:
    """给 Agent 一个简洁的建议文本，Agent 据此决定是否记录。

    这是"被动监听"的替代方案——Agent 每次回复用户前调用此函数，
    如果返回非空，Agent 可以主动问"要不要记一条？"
    """
    assessment = assess_record_worthiness(text)
    if assessment["worth_recording"] and assessment["score"] >= 6:
        tag_desc = {
            "决策": "🎯 这可能是一个值得记录的决策",
            "模式": "🔄 这可能是一次盲区再现或突破",
            "洞察": "💡 这可能是一个值得沉淀的洞察",
        }.get(assessment["suggested_tag"], "📝 这可能值得记录")

        return (
            f"{tag_desc}\n"
            f"  标题：{assessment['extracted_title']}\n"
            f"  标签：{assessment['suggested_tag']}"
            + (f" {assessment['suggested_mode']}" if assessment['suggested_mode'] else "")
            + f"\n  置信度：{assessment['score']}/20\n"
            f"  要不要记一条？"
        )
    return ""
