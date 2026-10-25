"""Endpoints de autenticación y perfil con refresh en cookie HttpOnly."""

from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.accounts.auth_cookies import (
    clear_refresh_cookie,
    get_refresh_from_request,
    set_refresh_cookie,
)
from apps.accounts.permissions import RequiereCabeceraCSRFPersonalizada
from apps.accounts.serializers import (
    LoginSerializer,
    LogoutSerializer,
    PerfilSerializer,
    RegistroSerializer,
)


class RegistroView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "register"
    serializer_class = RegistroSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        refresh = RefreshToken.for_user(instance)
        data = serializer.data
        resp = Response(data, status=status.HTTP_201_CREATED)
        resp.data["access"] = str(refresh.access_token)
        set_refresh_cookie(resp, str(refresh))
        return resp


class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"
    serializer_class = LoginSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if hasattr(serializer, "user"):
            refresh_token = RefreshToken.for_user(serializer.user)
            access = str(refresh_token.access_token)
            usuario_data = serializer.validated_data.get("usuario")
            resp = Response({"access": access, "usuario": usuario_data}, status=status.HTTP_200_OK)
            set_refresh_cookie(resp, str(refresh_token))
            return resp
        data = serializer.validated_data
        resp = Response(data, status=status.HTTP_200_OK)
        return resp


class CookieTokenRefreshView(TokenRefreshView):
    permission_classes = [AllowAny, RequiereCabeceraCSRFPersonalizada]

    def post(self, request, *args, **kwargs):
        refresh_token = get_refresh_from_request(request)
        if not refresh_token:
            return Response(
                {"detail": "No se proporcionó token de refresco."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        serializer = self.get_serializer(data={"refresh": refresh_token})
        try:
            serializer.is_valid(raise_exception=True)
        except Exception:
            return Response(
                {"detail": "Token inválido o expirado."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        data = serializer.validated_data
        resp = Response({"access": data.get("access")}, status=status.HTTP_200_OK)
        if data.get("refresh"):
            set_refresh_cookie(resp, data["refresh"])
        return resp


class LogoutView(APIView):
    permission_classes = [IsAuthenticated, RequiereCabeceraCSRFPersonalizada]
    serializer_class = LogoutSerializer

    def post(self, request):
        refresh_token = get_refresh_from_request(request) or request.data.get("refresh")
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except TokenError:
                pass
        resp = Response(status=status.HTTP_204_NO_CONTENT)
        clear_refresh_cookie(resp)
        return resp


class PerfilView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PerfilSerializer

    def get_object(self):
        return self.request.user
