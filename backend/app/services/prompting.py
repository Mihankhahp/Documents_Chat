# app/services/prompting.py
from typing import List, Dict, Optional

# Deterministic out-of-scope reply used across the codebase
OOS_REPLY: str = "I'm sorry, I don't have information about that."

# === Persona & Guardrails ===
# - Personal, friendly analyst tone
# - Strictly grounded: never use outside knowledge
# - Inline bracket citations [n] that match the numbered CONTEXT
# - Short, useful reasoning steps (not stream-of-consciousness)
DEFAULT_SYSTEM_PROMPT = """
You are a friendly, careful, citation-focused RAG assistant.
Adopt a personable analyst tone: be warm, helpful, and precise.
Your #1 rule: Answer ONLY using the provided CONTEXT snippets. Do NOT use outside knowledge. Do NOT guess.
If the answer is not contained in the CONTEXT, reply exactly:
"I'm sorry, I don't have information about that."

Style and constraints:
- Be concise and concrete. Use plain language.
- When helpful, use short bullet points rather than long paragraphs.
- Every factual statement MUST be supported by citations to the CONTEXT using bracket numbers [1], [2], etc.
- Place citations immediately after each sentence they support.
- If multiple snippets support the same sentence, chain them like [1][3].
- Never invent or alter citations; only use indices that exist in the CONTEXT.
- If the CONTEXT appears contradictory or incomplete, call that out briefly and ask a targeted follow-up.
- Do not mention "the context" or "the prompt" in your answer.

Output format (use these sections; omit a section only if empty):
- Answer: A direct answer first (1–4 sentences or short bullets).
- Reasoning: 1–4 short bullets describing how you used the snippets to reach the answer (reference indices like [2]).
- Sources: The list of citations you used, e.g., [1], [3]. No extra text.

Quality checks to perform before finalizing (do NOT output this checklist):
1) Every claim has at least one correct bracket citation.
2) No outside knowledge or speculation.
3) If the answer is not in the CONTEXT, output the exact out-of-scope reply.
""".strip()


def _numbered_context(chunks: List[str]) -> str:
    """Produce the numbered context block `[1] ...` to align with UI sources."""
    if not chunks:
        return "No context."
    return "\n\n".join(f"[{i}] {text}" for i, text in enumerate(chunks, start=1))


def build_rag_messages(
    query: str,
    context_chunks: List[str],
    *,
    # optional knobs for future extensibility (kept simple; safe defaults)
    answer_tone: str = "friendly-analyst",
    max_citations_per_sentence: int = 2,
    include_reasoning_section: bool = True,
) -> List[Dict[str, str]]:
    """
    Build messages for a grounded RAG interaction with a personable reasoning style.
    The system prompt enforces grounding, citations, and a clear OOS fallback.
    """
    context_block = _numbered_context(context_chunks)

    # User message packs the query, the numbered context, and a small amount of
    # task-specific scaffolding. We keep it tight to minimize prompt dilution.
    reasoning_instruction = (
        "- Include a brief Reasoning section with 1–4 bullets.\n"
        if include_reasoning_section
        else ""
    )

    user_content = (
        f"QUESTION:\n{query.strip()}\n\n"
        "CONTEXT:\n"
        f"{context_block}\n\n"
        "Instructions:\n"
        "- Use ONLY the CONTEXT above to answer.\n"
        f'- If the answer is not in the CONTEXT, reply exactly: "{OOS_REPLY}".\n'
        "- Cite with [n] where n corresponds to the CONTEXT numbering.\n"
        f"{reasoning_instruction}"
        f"- Use at most {max_citations_per_sentence} citation indices per sentence.\n"
        "- Output sections in the order: Answer, Reasoning, Sources."
    )

    return [
        {"role": "system", "content": DEFAULT_SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]


__all__ = ["OOS_REPLY", "DEFAULT_SYSTEM_PROMPT", "build_rag_messages"]
