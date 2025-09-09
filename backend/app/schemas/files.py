from pydantic import BaseModel

class AdminResetBody(BaseModel):
    preserve_users: bool = True
