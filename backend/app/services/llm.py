from typing import Optional, List, Dict, Union
import httpx
from fastapi import HTTPException
from openai import OpenAI
from ..config import (
    LLM_PROVIDER,
    LLM_MODEL,
    LLM_BASE_URL,
    OLLAMA_BASE_URL,
    OPENAI_API_KEY,
)

# imports (near the top of your file, replace the old OpenAI import)
from openai import AsyncOpenAI
from fastapi import HTTPException
import os


async def llm_chat_openai_sdk(
    messages,
    model,
    api_key,
    temperature: float = 0.2,
    max_output_tokens: Optional[int] = None,
    top_p: Optional[float] = None,
    stop: Optional[Union[List[str], str]] = None,
    use_responses_api: Optional[bool] = None,
):
    if not api_key:
        raise HTTPException(
            400,
            {
                "message": "Missing OpenAI key. Provide X-OpenAI-Key or set OPENAI_API_KEY."
            },
        )

    # Default to Responses API unless explicitly disabled via env
    if use_responses_api is None:
        use_responses_api = os.getenv("OPENAI_USE_RESPONSES_API", "true").lower() in (
            "1",
            "true",
            "yes",
        )

    client = AsyncOpenAI(api_key=api_key)

    try:
        if use_responses_api:
            # Split system messages into 'instructions'; rest go into 'input'
            instructions = (
                "\n".join([m["content"] for m in messages if m.get("role") == "system"])
                or None
            )
            input_messages = [
                {
                    "role": m["role"],
                    "content": [{"type": "input_text", "text": m.get("content", "")}],
                }
                for m in messages
                if m.get("role") != "system"
            ] or [{"role": "user", "content": [{"type": "input_text", "text": ""}]}]

            payload = {
                "model": model,
                "input": input_messages,
                "temperature": temperature,
            }
            if instructions:
                payload["instructions"] = instructions
            if max_output_tokens is not None:
                payload["max_output_tokens"] = int(max_output_tokens)
            if top_p is not None:
                payload["top_p"] = float(top_p)
            if stop is not None:
                payload["stop"] = stop

            print("Max output tokens:", payload["max_output_tokens"])
            resp = await client.responses.create(**payload)
            text = getattr(resp, "output_text", None)
            return text if text is not None else str(resp)

        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
        }
        if max_output_tokens is not None:
            payload["max_output_tokens"] = int(max_output_tokens)
        if top_p is not None:
            payload["top_p"] = float(top_p)
        if stop is not None:
            payload["stop"] = stop

        resp = await client.chat.completions.create(**payload)
        return resp.choices[0].message.content

    except Exception as e:
        raise HTTPException(502, {"message": f"OpenAI SDK error: {e}"})


async def llm_chat_ollama(
    messages,
    model,
    temperature: float = 0.2,
    base_url=OLLAMA_BASE_URL,
    max_output_tokens: Optional[int] = None,
    top_p: Optional[float] = None,
    stop: Optional[Union[List[str], str]] = None,
):
    url = f"{base_url}/api/chat"
    options = {"temperature": temperature}
    if top_p is not None:
        options["top_p"] = float(top_p)
    if stop is not None:
        options["stop"] = stop

    payload = {
        "model": model,
        "messages": [{"role": m["role"], "content": m["content"]} for m in messages],
        "options": options,
        "stream": False,
    }
    async with httpx.AsyncClient(timeout=120) as client:
        r = await client.post(url, json=payload)
        if r.status_code >= 400:
            raise HTTPException(r.status_code, {"message": f"Ollama error: {r.text}"})
        data = r.json()
        if (
            isinstance(data, dict)
            and "message" in data
            and "content" in data["message"]
        ):
            return data["message"]["content"]
        return (data.get("response") or "").strip()


async def llm_chat(
    messages: List[Dict[str, str]],
    temperature: float = 0.2,
    openai_key_header: str = "",
    provider_override: Optional[str] = None,
    model_override: Optional[str] = None,
    max_output_tokens: Optional[int] = None,
    top_p: Optional[float] = None,
    stop: Optional[Union[List[str], str]] = None,
    use_responses_api: Optional[bool] = None,
):
    provider = (provider_override or LLM_PROVIDER or "").lower()
    model = model_override or LLM_MODEL

    if provider == "openai":
        key = (
            openai_key_header or DEFAULT_OPENAI_API_KEY
        )  # or OPENAI_API_KEY if that's your var
        return await llm_chat_openai_sdk(
            messages,
            model=model,
            api_key=key,
            temperature=temperature,
            max_output_tokens=max_output_tokens,
            top_p=top_p,
            stop=stop,
            use_responses_api=use_responses_api,
        )
    if provider == "ollama":
        return await llm_chat_ollama(
            messages,
            model=model,
            temperature=temperature,
            max_output_tokens=max_output_tokens,
            top_p=top_p,
            stop=stop,
        )

    raise HTTPException(
        400,
        {
            "message": f"Unsupported provider '{provider}'. Use 'openai', 'openai_compat', or 'ollama'."
        },
    )
