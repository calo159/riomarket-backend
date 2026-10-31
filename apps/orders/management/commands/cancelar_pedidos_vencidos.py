"""Cancela los retiros cuyo plazo venció y avisa los que están por vencer (ADR-012).

Render gratis no tiene cron: este comando corre al arrancar el servicio
(``scripts/render-start.sh``) y se puede lanzar a mano. Es idempotente.

    python manage.py cancelar_pedidos_vencidos --dry-run
    python manage.py cancelar_pedidos_vencidos --limite 100
"""

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.orders import vencimientos
from apps.orders.models import Pedido


class Command(BaseCommand):
    help = "Cancela los pedidos de retiro vencidos (no confirmados o no recogidos a tiempo)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Solo lista lo que se cancelaría; no cambia nada.",
        )
        parser.add_argument(
            "--limite",
            type=int,
            default=None,
            help="Máximo de pedidos a revisar en esta ejecución (por defecto, sin límite).",
        )

    def handle(self, *args, **opciones):
        limite = opciones["limite"]
        if limite is not None and limite < 1:
            self.stderr.write("--limite debe ser al menos 1.")
            return
        if opciones["dry_run"]:
            self._simular(limite)
            return
        resultado = vencimientos.barrer(limite=limite, origen="comando")
        self.stdout.write(
            f"Revisados: {resultado.revisados} · Cancelados: {len(resultado.cancelados)} · "
            f"Avisados: {len(resultado.avisados)} · Omitidos: {resultado.omitidos}"
        )

    def _simular(self, limite):
        ahora = timezone.now()
        vencidos, por_vencer = vencimientos._buscar_candidatos(ahora=ahora, limite=limite)
        self.stdout.write("Modo dry-run: no se cancela ni se avisa nada.")
        for pk, etiqueta in [(p, "vencido") for p in vencidos] + [
            (p, "por vencer") for p in por_vencer
        ]:
            estado, vence = Pedido.objects.values_list("estado", "vence_en").get(pk=pk)
            self.stdout.write(f"  #{pk} · {etiqueta} · {estado} · vence {vence:%Y-%m-%d %H:%M}")
        self.stdout.write(f"Vencidos: {len(vencidos)} · Por vencer: {len(por_vencer)}")
