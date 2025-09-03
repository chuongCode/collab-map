from typing import Dict
import os

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from google.oauth2 import id_token
from google.auth.transport import requests as grequests

router = APIRouter()


class TokenPayload(BaseModel):
    id_token: str


@router.post('/auth/google')
async def verify_google_token(payload: TokenPayload) -> Dict[str, str]:
    """Verify a Google ID token and return a minimal user profile.

    Returns: { id, name, initials, email }
    """
    token = payload.id_token
    if not token:
        raise HTTPException(status_code=400, detail='id_token required')

    try:
        # Audience validation uses environment variable GOOGLE_CLIENT_ID when present
        audience = os.environ.get('GOOGLE_CLIENT_ID')
        info = id_token.verify_oauth2_token(token, grequests.Request(), audience)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f'invalid token: {e}')

    # Build a lightweight user object
    user_id = info.get('sub')
    name = info.get('name') or info.get('email') or 'Unknown'
    initials = ''.join([part[0] for part in name.split() if part])[:2].upper()
    picture = info.get('picture')
    return {
        'id': user_id,
        'name': name,
        'initials': initials,
        'email': info.get('email'),
        'picture': picture,
    }
