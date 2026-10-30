from django.core.management.base import BaseCommand

from apps.rbac.defaults import sembrar
from apps.rbac.models import Recurso, Rol, RolRecurso


class Command(BaseCommand):
    help = "Siembra (idempotente) los roles base y el catálogo de recursos por defecto."

    def handle(self, *args, **options):
        creados = sembrar(Rol, Recurso, RolRecurso)
        self.stdout.write(self.style.SUCCESS(f"RBAC listo: {creados} recurso(s) nuevo(s)."))
