import subprocess

message = input("Migration message: ")
subprocess.run(["alembic", "revision", "--autogenerate", "-m", message])
subprocess.run(["alembic", "upgrade", "head"])
