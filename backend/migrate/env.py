from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool
from sqlalchemy import text
from sqlalchemy import create_engine

from alembic import context

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
from models import Base
from utils.env import get_env_var


target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    # Build URL from environment variables (using lowercase database name)
    url = f"postgresql+psycopg2://{get_env_var('DB_USER')}:{get_env_var('DB_PASSWORD')}@{get_env_var('DB_HOST')}:{get_env_var('DB_PORT')}/{get_env_var('DB_NAME').lower()}"
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    # Get database configuration from environment variables
    db_user = get_env_var('DB_USER')
    db_password = get_env_var('DB_PASSWORD')
    db_host = get_env_var('DB_HOST')
    db_port = get_env_var('DB_PORT')
    db_name = get_env_var('DB_NAME').lower()  # PostgreSQL converts database names to lowercase
    
    # First, connect to the default postgres database to check if target database exists
    postgres_url = f"postgresql+psycopg2://{db_user}:{db_password}@{db_host}:{db_port}/postgres"
    admin_engine = create_engine(postgres_url, poolclass=pool.NullPool, isolation_level="AUTOCOMMIT")
    
    try:
        with admin_engine.connect() as conn:
            # Check if database exists (using lowercase comparison since PostgreSQL converts names to lowercase)
            result = conn.execute(text(f"SELECT 1 FROM pg_database WHERE LOWER(datname) = '{db_name}'"))
            if not result.fetchone():
                # Database doesn't exist, create it
                print(f"Creating database '{db_name}'...")
                conn.execute(text(f"CREATE DATABASE {db_name}"))
                print(f"Database '{db_name}' created successfully.")
            else:
                print(f"Database '{db_name}' already exists.")
    except Exception as e:
        print(f"Warning: Could not check/create database: {e}")
    finally:
        admin_engine.dispose()
    
    # Now connect to the target database for migrations (using lowercase database name)
    target_url = f"postgresql+psycopg2://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
    connectable = create_engine(target_url, poolclass=pool.NullPool)

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
