# -*- coding: utf-8 -*-
"""
你的世界编辑器 · 数据模型

三层结构：
  Event（事件）→ Pattern（模式）→ Decision（决策）
每个模型都有 confidence/source/grounded 字段用于防幻觉标记。
"""

from __future__ import annotations

from dataclasses import dataclass, field, asdict, fields
from datetime import datetime


# ── 事件层 ──────────────────────────────────────────────────────

@dataclass
class Event:
    """一条人生事件记录。"""
    timestamp: str = field(default_factory=lambda: datetime.now().strftime("%Y-%m-%d %H:%M"))
    tag: str = ""                # 决策 | 模式 | 洞察 | "" (无标签)
    mode: str = ""               # ❌ (盲区再现) | ✅ (突破) | ""
    title: str = ""              # 一句话标题
    text: str = ""               # 1-5 句描述
    source: str = "free_text"    # free_text | voice | image | link | document
    pattern_refs: list[str] = field(default_factory=list)  # 关联的模式条目名
    confidence: str = "medium"   # high | medium | low（模式匹配确信度）
    grounded: bool = True        # 可追溯到真实事件
    merged: bool = False         # 已 merge 到叙事层

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> "Event":
        allowed = {f.name for f in fields(cls)}
        return cls(**{k: v for k, v in d.items() if k in allowed})


# ── 规律层 ──────────────────────────────────────────────────────

@dataclass
class Pattern:
    """一条行为模式或盲区。"""
    name: str                    # 模式名称
    type: str = "blind_spot"     # positive | blind_spot
    trigger: str = ""            # 触发情境
    core: str = ""               # 一句话核心模式
    root_cause: str = ""         # 根源（盲区专属）
    countermeasure: str = ""     # 识别时怎么办
    source: str = "observed"     # initial_archive | observed | user_confirmed
    confidence: str = "medium"   # high | medium | low
    emotional_triggers: list[str] = field(default_factory=list)
    bookquotes: list[dict] = field(default_factory=list)
    # bookquotes: [{"type": "❌"|"✅"|"通用", "text": "...", "source": "《书名》"}]

    cases: list[dict] = field(default_factory=list)
    # cases: [{"timestamp": "YYYY-MM-DD", "symbol": "❌"|"✅", "description": "...",
    #          "bookquote": "📖 ... ——《书名》" | None}]

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> "Pattern":
        allowed = {f.name for f in fields(cls)}
        return cls(**{k: v for k, v in d.items() if k in allowed})


# ── 决策层 ──────────────────────────────────────────────────────

@dataclass
class Decision:
    """一条决策记录。"""
    timestamp: str = field(default_factory=lambda: datetime.now().strftime("%Y-%m-%d"))
    context: str = ""            # 决策背景
    choice: str = ""             # 选择
    framework_used: str = ""     # 用了什么判断框架
    framework_applied: bool = True  # 防幻觉：是否真的用了用户框架
    blind_spot_scan: list[str] = field(default_factory=list)  # 扫描到的盲区
    reasoning: str = ""          # 1-2 句理由
    review_date: str = ""        # 三个月后回看日期
    source_module: str = "life-os"  # life-os | life-jobhunt | life-money | ...
    actual_outcome: str = ""     # 回看时的实际结果（空=未回看）
    outcome_deviation: str = ""  # 预期 vs 实际偏差分析

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> "Decision":
        allowed = {f.name for f in fields(cls)}
        return cls(**{k: v for k, v in d.items() if k in allowed})


# ── 聚合报告 ────────────────────────────────────────────────────

@dataclass
class WeeklyReview:
    """一次周复盘的结构化数据。"""
    week_label: str = ""         # YYYY-WXX
    time_pie: dict = field(default_factory=dict)  # {维度: 百分比}
    dimensions: dict = field(default_factory=dict)  # {维度: "↑↑"|"↑"|"→"|"↓"|"↓↓"}
    blind_spot_hits: list[dict] = field(default_factory=list)  # [{name, count_❌, count_✅}]
    aha_moments: list[str] = field(default_factory=list)
    fragment_time: str = ""      # 碎片时间用在了哪里
    body_base: str = ""          # 睡眠/运动地基

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> "WeeklyReview":
        allowed = {f.name for f in fields(cls)}
        return cls(**{k: v for k, v in d.items() if k in allowed})
