from tasks.base import TaskBase as ModernTaskBase


class TaskBase(ModernTaskBase):
    @classmethod
    def log_inicio(cls):
        return cls.log_start()

    @classmethod
    def log_fim(cls):
        return cls.log_end()


__all__ = ["TaskBase"]
