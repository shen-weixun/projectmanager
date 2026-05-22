import os

from dotenv import load_dotenv

load_dotenv()


def get_env_var(var: str, default=None) -> str:
    """
    Get the environment variable or return the default value.
    """
    value = os.getenv(var, default)
    print(f"[Env] {var} = {value}", flush=True)
    if value is None:
        raise ValueError(
            f"Environment variable '{var}' not found and no default provided.")
    return value
