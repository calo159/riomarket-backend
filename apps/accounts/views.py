"""Endpoints de autenticación y perfil.

- registro/login: throttling por scope (evita fuerzas brutas masivas).
- logout: revoca (blacklist) el token de refresco entregado.
- perfil: lectura/edición del propio usuario.
"""

from rest_framework import exceptions, generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.accounts.serializers import (
    LoginSerializer,
    LogoutSerializer,
    PerfilSerializer,
    RegistroSerializer,
)


class RegistroView(generics.CreateAPIView):
    """``POST /api/auth/registro/`` — crea una cuenta pública."""

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "register"
    serializer_class = RegistroSerializer


class LoginView(TokenObtainPairView):
    """``POST /api/auth/login/`` — devuelve access/refresh + datos del usuario."""

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"
    serializer_class = LoginSerializer


class LogoutView(APIView):
    """``POST /api/auth/logout/`` — revoca el refresh (blacklist)."""

    permission_classes = [IsAuthenticated]
    serializer_class = LogoutSerializer

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            token = RefreshToken(serializer.validated_data["refresh"])
            token.blacklist()
        except TokenError as exc:
            raise exceptions.AuthenticationFailed(
                "Token de refresco inválido o ya revocado."
            ) from exc
        return Response(status=status.HTTP_204_NO_CONTENT)


class PerfilView(generics.RetrieveUpdateAPIView):
    """``GET/PATCH /api/auth/perfil/`` — el propio usuario autenticado."""

    permission_classes = [IsAuthenticated]
    serializer_class = PerfilSerializer

    def get_object(self):
        return self.request.user
