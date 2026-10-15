--
-- PostgreSQL database dump
--

\restrict 6jp16m6hDPhQ2YzC1EeTHu399KSby6VFG7dpCiSZXHZ4Kjkfo8fYaALV6rVlK4X

-- Dumped from database version 17.11
-- Dumped by pg_dump version 17.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

DROP EVENT TRIGGER IF EXISTS pgrst_drop_watch;
DROP EVENT TRIGGER IF EXISTS pgrst_ddl_watch;
DROP EVENT TRIGGER IF EXISTS issue_pg_net_access;
DROP EVENT TRIGGER IF EXISTS issue_pg_graphql_access;
DROP EVENT TRIGGER IF EXISTS issue_pg_cron_access;
DROP EVENT TRIGGER IF EXISTS issue_graphql_placeholder;
DROP EVENT TRIGGER IF EXISTS ensure_rls;
DROP PUBLICATION IF EXISTS supabase_realtime;
ALTER TABLE IF EXISTS ONLY storage.vector_indexes DROP CONSTRAINT IF EXISTS vector_indexes_bucket_id_fkey;
ALTER TABLE IF EXISTS ONLY storage.s3_multipart_uploads_parts DROP CONSTRAINT IF EXISTS s3_multipart_uploads_parts_upload_id_fkey;
ALTER TABLE IF EXISTS ONLY storage.s3_multipart_uploads_parts DROP CONSTRAINT IF EXISTS s3_multipart_uploads_parts_bucket_id_fkey;
ALTER TABLE IF EXISTS ONLY storage.s3_multipart_uploads DROP CONSTRAINT IF EXISTS s3_multipart_uploads_bucket_id_fkey;
ALTER TABLE IF EXISTS ONLY storage.objects DROP CONSTRAINT IF EXISTS "objects_bucketId_fkey";
ALTER TABLE IF EXISTS ONLY public.token_blacklist_outstandingtoken DROP CONSTRAINT IF EXISTS token_blacklist_outs_user_id_83bc629a_fk_accounts_;
ALTER TABLE IF EXISTS ONLY public.token_blacklist_blacklistedtoken DROP CONSTRAINT IF EXISTS token_blacklist_blacklistedtoken_token_id_3cc7fe56_fk;
ALTER TABLE IF EXISTS ONLY public.reviews_resena DROP CONSTRAINT IF EXISTS reviews_resena_id_usuario_id_1e8a725a_fk_accounts_usuario_id;
ALTER TABLE IF EXISTS ONLY public.reviews_resena DROP CONSTRAINT IF EXISTS reviews_resena_id_puesto_id_aca08df0_fk_catalog_puesto_id;
ALTER TABLE IF EXISTS ONLY public.reviews_resena DROP CONSTRAINT IF EXISTS reviews_resena_id_pedido_id_8c14451c_fk_orders_pedido_id;
ALTER TABLE IF EXISTS ONLY public.promotions_usocupon DROP CONSTRAINT IF EXISTS promotions_usocupon_id_usuario_id_21d30322_fk_accounts_;
ALTER TABLE IF EXISTS ONLY public.promotions_usocupon DROP CONSTRAINT IF EXISTS promotions_usocupon_id_pedido_id_b64d590f_fk_orders_pedido_id;
ALTER TABLE IF EXISTS ONLY public.promotions_usocupon DROP CONSTRAINT IF EXISTS promotions_usocupon_id_cupon_id_7b21b04d_fk_promotions_cupon_id;
ALTER TABLE IF EXISTS ONLY public.promotions_cupon DROP CONSTRAINT IF EXISTS promotions_cupon_id_puesto_id_91fd00c6_fk_catalog_puesto_id;
ALTER TABLE IF EXISTS ONLY public.payments_pago DROP CONSTRAINT IF EXISTS payments_pago_id_pedido_id_87ba8513_fk_orders_pedido_id;
ALTER TABLE IF EXISTS ONLY public.orders_pedido DROP CONSTRAINT IF EXISTS orders_pedido_id_puesto_id_d8afb9da_fk_catalog_puesto_id;
ALTER TABLE IF EXISTS ONLY public.orders_pedido DROP CONSTRAINT IF EXISTS orders_pedido_id_direccion_id_9ce55aa3_fk_addresses;
ALTER TABLE IF EXISTS ONLY public.orders_pedido DROP CONSTRAINT IF EXISTS orders_pedido_id_cupon_id_b468b5aa_fk_promotions_cupon_id;
ALTER TABLE IF EXISTS ONLY public.orders_pedido DROP CONSTRAINT IF EXISTS orders_pedido_id_comprador_id_606dfd58_fk_accounts_usuario_id;
ALTER TABLE IF EXISTS ONLY public.orders_itempedido DROP CONSTRAINT IF EXISTS orders_itempedido_id_producto_id_72694daa_fk_catalog_p;
ALTER TABLE IF EXISTS ONLY public.orders_itempedido DROP CONSTRAINT IF EXISTS orders_itempedido_id_pedido_id_b2f7791a_fk_orders_pedido_id;
ALTER TABLE IF EXISTS ONLY public.notifications_notificacion DROP CONSTRAINT IF EXISTS notifications_notifi_id_usuario_id_4dc24873_fk_accounts_;
ALTER TABLE IF EXISTS ONLY public.notifications_notificacion DROP CONSTRAINT IF EXISTS notifications_notifi_id_pedido_id_c3dd94f0_fk_orders_pe;
ALTER TABLE IF EXISTS ONLY public.django_admin_log DROP CONSTRAINT IF EXISTS django_admin_log_user_id_c564eba6_fk_accounts_usuario_id;
ALTER TABLE IF EXISTS ONLY public.django_admin_log DROP CONSTRAINT IF EXISTS django_admin_log_content_type_id_c4bce8eb_fk_django_co;
ALTER TABLE IF EXISTS ONLY public.catalog_puestocategoria DROP CONSTRAINT IF EXISTS catalog_puestocatego_id_puesto_id_e7fc516e_fk_catalog_p;
ALTER TABLE IF EXISTS ONLY public.catalog_puestocategoria DROP CONSTRAINT IF EXISTS catalog_puestocatego_id_categoria_id_3e0f0a30_fk_catalog_c;
ALTER TABLE IF EXISTS ONLY public.catalog_puesto DROP CONSTRAINT IF EXISTS catalog_puesto_id_vendedor_id_80607243_fk_accounts_usuario_id;
ALTER TABLE IF EXISTS ONLY public.catalog_producto DROP CONSTRAINT IF EXISTS catalog_producto_id_puesto_id_73769f19_fk_catalog_puesto_id;
ALTER TABLE IF EXISTS ONLY public.catalog_producto DROP CONSTRAINT IF EXISTS catalog_producto_id_categoria_id_24920292_fk_catalog_c;
ALTER TABLE IF EXISTS ONLY public.catalog_imagenproducto DROP CONSTRAINT IF EXISTS catalog_imagenproduc_id_producto_id_ffb313ab_fk_catalog_p;
ALTER TABLE IF EXISTS ONLY public.catalog_categoria DROP CONSTRAINT IF EXISTS catalog_categoria_id_categoria_padre_i_56714595_fk_catalog_c;
ALTER TABLE IF EXISTS ONLY public.auth_permission DROP CONSTRAINT IF EXISTS auth_permission_content_type_id_2f476e4b_fk_django_co;
ALTER TABLE IF EXISTS ONLY public.auth_group_permissions DROP CONSTRAINT IF EXISTS auth_group_permissions_group_id_b120cbf9_fk_auth_group_id;
ALTER TABLE IF EXISTS ONLY public.auth_group_permissions DROP CONSTRAINT IF EXISTS auth_group_permissio_permission_id_84c5c92e_fk_auth_perm;
ALTER TABLE IF EXISTS ONLY public.audit_registroauditoria DROP CONSTRAINT IF EXISTS audit_registroaudito_id_usuario_id_2cca3e92_fk_accounts_;
ALTER TABLE IF EXISTS ONLY public.addresses_direccion DROP CONSTRAINT IF EXISTS addresses_direccion_id_usuario_id_2f6ad862_fk_accounts_;
ALTER TABLE IF EXISTS ONLY public.accounts_vendedor DROP CONSTRAINT IF EXISTS accounts_vendedor_id_usuario_id_503245b8_fk_accounts_usuario_id;
ALTER TABLE IF EXISTS ONLY public.accounts_vendedor DROP CONSTRAINT IF EXISTS accounts_vendedor_id_revisor_id_d7ac8fb1_fk_accounts_usuario_id;
ALTER TABLE IF EXISTS ONLY public.accounts_usuario_user_permissions DROP CONSTRAINT IF EXISTS accounts_usuario_use_usuario_id_d048ad71_fk_accounts_;
ALTER TABLE IF EXISTS ONLY public.accounts_usuario_user_permissions DROP CONSTRAINT IF EXISTS accounts_usuario_use_permission_id_3de42c14_fk_auth_perm;
ALTER TABLE IF EXISTS ONLY public.accounts_usuario_groups DROP CONSTRAINT IF EXISTS accounts_usuario_groups_group_id_81d91a41_fk_auth_group_id;
ALTER TABLE IF EXISTS ONLY public.accounts_usuario_groups DROP CONSTRAINT IF EXISTS accounts_usuario_gro_usuario_id_8eb16911_fk_accounts_;
ALTER TABLE IF EXISTS ONLY auth.webauthn_credentials DROP CONSTRAINT IF EXISTS webauthn_credentials_user_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.webauthn_challenges DROP CONSTRAINT IF EXISTS webauthn_challenges_user_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.sso_domains DROP CONSTRAINT IF EXISTS sso_domains_sso_provider_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.sessions DROP CONSTRAINT IF EXISTS sessions_user_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.sessions DROP CONSTRAINT IF EXISTS sessions_oauth_client_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.scim_users DROP CONSTRAINT IF EXISTS scim_users_user_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.scim_users DROP CONSTRAINT IF EXISTS scim_users_sso_provider_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.scim_tokens DROP CONSTRAINT IF EXISTS scim_tokens_sso_provider_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.saml_relay_states DROP CONSTRAINT IF EXISTS saml_relay_states_sso_provider_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.saml_relay_states DROP CONSTRAINT IF EXISTS saml_relay_states_flow_state_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.saml_providers DROP CONSTRAINT IF EXISTS saml_providers_sso_provider_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_session_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.one_time_tokens DROP CONSTRAINT IF EXISTS one_time_tokens_user_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_consents DROP CONSTRAINT IF EXISTS oauth_consents_user_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_consents DROP CONSTRAINT IF EXISTS oauth_consents_client_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_authorizations DROP CONSTRAINT IF EXISTS oauth_authorizations_user_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_authorizations DROP CONSTRAINT IF EXISTS oauth_authorizations_client_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.mfa_recovery_codes DROP CONSTRAINT IF EXISTS mfa_recovery_codes_mfa_recovery_code_set_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.mfa_recovery_code_sets DROP CONSTRAINT IF EXISTS mfa_recovery_code_sets_user_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.mfa_recovery_code_sets DROP CONSTRAINT IF EXISTS mfa_recovery_code_sets_mfa_factor_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.mfa_factors DROP CONSTRAINT IF EXISTS mfa_factors_user_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.mfa_challenges DROP CONSTRAINT IF EXISTS mfa_challenges_auth_factor_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.mfa_amr_claims DROP CONSTRAINT IF EXISTS mfa_amr_claims_session_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.identities DROP CONSTRAINT IF EXISTS identities_user_id_fkey;
DROP TRIGGER IF EXISTS update_objects_updated_at ON storage.objects;
DROP TRIGGER IF EXISTS protect_objects_delete ON storage.objects;
DROP TRIGGER IF EXISTS protect_buckets_delete ON storage.buckets;
DROP TRIGGER IF EXISTS protect_bucket_control_update_role ON storage.buckets;
DROP TRIGGER IF EXISTS protect_bucket_control_update ON storage.buckets;
DROP TRIGGER IF EXISTS protect_bucket_control_insert ON storage.buckets;
DROP TRIGGER IF EXISTS enforce_bucket_name_length_trigger ON storage.buckets;
DROP TRIGGER IF EXISTS tr_check_filters ON realtime.subscription;
DROP INDEX IF EXISTS storage.vector_indexes_name_bucket_id_idx;
DROP INDEX IF EXISTS storage.objects_bucket_id_name_version_key;
DROP INDEX IF EXISTS storage.name_prefix_search;
DROP INDEX IF EXISTS storage.idx_objects_null_version;
DROP INDEX IF EXISTS storage.idx_objects_delete_markers;
DROP INDEX IF EXISTS storage.idx_objects_current_version;
DROP INDEX IF EXISTS storage.idx_objects_bucket_id_name_lower;
DROP INDEX IF EXISTS storage.idx_objects_bucket_id_name;
DROP INDEX IF EXISTS storage.idx_multipart_uploads_list;
DROP INDEX IF EXISTS storage.buckets_analytics_unique_name_idx;
DROP INDEX IF EXISTS storage.bname;
DROP INDEX IF EXISTS realtime.subscription_subscription_id_entity_filters_action_filter_selec;
DROP INDEX IF EXISTS realtime.messages_inserted_at_topic_index;
DROP INDEX IF EXISTS realtime.ix_realtime_subscription_entity;
DROP INDEX IF EXISTS public.token_blacklist_outstandingtoken_user_id_83bc629a;
DROP INDEX IF EXISTS public.token_blacklist_outstandingtoken_jti_hex_d9bdf6f7_like;
DROP INDEX IF EXISTS public.reviews_resena_id_usuario_id_1e8a725a;
DROP INDEX IF EXISTS public.reviews_resena_id_puesto_id_aca08df0;
DROP INDEX IF EXISTS public.reviews_resena_id_pedido_id_8c14451c;
DROP INDEX IF EXISTS public.promotions_usocupon_id_usuario_id_21d30322;
DROP INDEX IF EXISTS public.promotions_usocupon_id_pedido_id_b64d590f;
DROP INDEX IF EXISTS public.promotions_usocupon_id_cupon_id_7b21b04d;
DROP INDEX IF EXISTS public.promotions_cupon_id_puesto_id_91fd00c6;
DROP INDEX IF EXISTS public.promotions_cupon_codigo_7b5437e5_like;
DROP INDEX IF EXISTS public.orders_pedido_id_puesto_id_d8afb9da;
DROP INDEX IF EXISTS public.orders_pedido_id_direccion_id_9ce55aa3;
DROP INDEX IF EXISTS public.orders_pedido_id_cupon_id_b468b5aa;
DROP INDEX IF EXISTS public.orders_pedido_id_comprador_id_606dfd58;
DROP INDEX IF EXISTS public.orders_itempedido_id_producto_id_72694daa;
DROP INDEX IF EXISTS public.orders_itempedido_id_pedido_id_b2f7791a;
DROP INDEX IF EXISTS public.notifications_notificacion_id_usuario_id_4dc24873;
DROP INDEX IF EXISTS public.notifications_notificacion_id_pedido_id_c3dd94f0;
DROP INDEX IF EXISTS public.django_session_session_key_c0390e0f_like;
DROP INDEX IF EXISTS public.django_session_expire_date_a5c62663;
DROP INDEX IF EXISTS public.django_admin_log_user_id_c564eba6;
DROP INDEX IF EXISTS public.django_admin_log_content_type_id_c4bce8eb;
DROP INDEX IF EXISTS public.direccion_predeterminada_unica_por_usuario;
DROP INDEX IF EXISTS public.catalog_puestocategoria_id_puesto_id_e7fc516e;
DROP INDEX IF EXISTS public.catalog_puestocategoria_id_categoria_id_3e0f0a30;
DROP INDEX IF EXISTS public.catalog_puesto_id_vendedor_id_80607243;
DROP INDEX IF EXISTS public.catalog_producto_id_puesto_id_73769f19;
DROP INDEX IF EXISTS public.catalog_producto_id_categoria_id_24920292;
DROP INDEX IF EXISTS public.catalog_imagenproducto_id_producto_id_ffb313ab;
DROP INDEX IF EXISTS public.catalog_categoria_nombre_2c3fc6c4_like;
DROP INDEX IF EXISTS public.catalog_categoria_id_categoria_padre_id_56714595;
DROP INDEX IF EXISTS public.auth_permission_content_type_id_2f476e4b;
DROP INDEX IF EXISTS public.auth_group_permissions_permission_id_84c5c92e;
DROP INDEX IF EXISTS public.auth_group_permissions_group_id_b120cbf9;
DROP INDEX IF EXISTS public.auth_group_name_a6ea08ec_like;
DROP INDEX IF EXISTS public.auditoria_fecha_idx;
DROP INDEX IF EXISTS public.auditoria_entidad_idx;
DROP INDEX IF EXISTS public.auditoria_accion_idx;
DROP INDEX IF EXISTS public.audit_registroauditoria_id_usuario_id_2cca3e92;
DROP INDEX IF EXISTS public.addresses_direccion_id_usuario_id_2f6ad862;
DROP INDEX IF EXISTS public.accounts_vendedor_id_revisor_id_d7ac8fb1;
DROP INDEX IF EXISTS public.accounts_vendedor_cedula_huella_d4bb273a_like;
DROP INDEX IF EXISTS public.accounts_usuario_user_permissions_usuario_id_d048ad71;
DROP INDEX IF EXISTS public.accounts_usuario_user_permissions_permission_id_3de42c14;
DROP INDEX IF EXISTS public.accounts_usuario_groups_usuario_id_8eb16911;
DROP INDEX IF EXISTS public.accounts_usuario_groups_group_id_81d91a41;
DROP INDEX IF EXISTS public.accounts_usuario_correo_1c6aa2c7_like;
DROP INDEX IF EXISTS public.accounts_usuario_celular_569672da_like;
DROP INDEX IF EXISTS auth.webauthn_credentials_user_id_idx;
DROP INDEX IF EXISTS auth.webauthn_credentials_credential_id_key;
DROP INDEX IF EXISTS auth.webauthn_challenges_user_id_idx;
DROP INDEX IF EXISTS auth.webauthn_challenges_expires_at_idx;
DROP INDEX IF EXISTS auth.users_is_anonymous_idx;
DROP INDEX IF EXISTS auth.users_instance_id_idx;
DROP INDEX IF EXISTS auth.users_instance_id_email_idx;
DROP INDEX IF EXISTS auth.users_email_partial_key;
DROP INDEX IF EXISTS auth.user_id_created_at_idx;
DROP INDEX IF EXISTS auth.unique_phone_factor_per_user;
DROP INDEX IF EXISTS auth.sso_providers_resource_id_pattern_idx;
DROP INDEX IF EXISTS auth.sso_providers_resource_id_idx;
DROP INDEX IF EXISTS auth.sso_domains_sso_provider_id_idx;
DROP INDEX IF EXISTS auth.sso_domains_domain_idx;
DROP INDEX IF EXISTS auth.sessions_user_id_idx;
DROP INDEX IF EXISTS auth.sessions_oauth_client_id_idx;
DROP INDEX IF EXISTS auth.sessions_not_after_idx;
DROP INDEX IF EXISTS auth.scim_users_user_name_key;
DROP INDEX IF EXISTS auth.scim_users_user_name_idx;
DROP INDEX IF EXISTS auth.scim_users_user_id_idx;
DROP INDEX IF EXISTS auth.scim_users_updated_at_idx;
DROP INDEX IF EXISTS auth.scim_users_sso_provider_id_idx;
DROP INDEX IF EXISTS auth.scim_users_id_idx;
DROP INDEX IF EXISTS auth.scim_users_external_id_key;
DROP INDEX IF EXISTS auth.scim_users_deleted_at_idx;
DROP INDEX IF EXISTS auth.scim_users_created_at_idx;
DROP INDEX IF EXISTS auth.scim_tokens_token_hash_key;
DROP INDEX IF EXISTS auth.scim_tokens_sso_provider_id_idx;
DROP INDEX IF EXISTS auth.scim_tokens_revoked_at_idx;
DROP INDEX IF EXISTS auth.scim_tokens_expires_at_idx;
DROP INDEX IF EXISTS auth.saml_relay_states_sso_provider_id_idx;
DROP INDEX IF EXISTS auth.saml_relay_states_for_email_idx;
DROP INDEX IF EXISTS auth.saml_relay_states_created_at_idx;
DROP INDEX IF EXISTS auth.saml_providers_sso_provider_id_idx;
DROP INDEX IF EXISTS auth.refresh_tokens_updated_at_idx;
DROP INDEX IF EXISTS auth.refresh_tokens_session_id_revoked_idx;
DROP INDEX IF EXISTS auth.refresh_tokens_parent_idx;
DROP INDEX IF EXISTS auth.refresh_tokens_instance_id_user_id_idx;
DROP INDEX IF EXISTS auth.refresh_tokens_instance_id_idx;
DROP INDEX IF EXISTS auth.recovery_token_idx;
DROP INDEX IF EXISTS auth.reauthentication_token_idx;
DROP INDEX IF EXISTS auth.one_time_tokens_user_id_token_type_key;
DROP INDEX IF EXISTS auth.one_time_tokens_token_hash_hash_idx;
DROP INDEX IF EXISTS auth.one_time_tokens_relates_to_hash_idx;
DROP INDEX IF EXISTS auth.oauth_consents_user_order_idx;
DROP INDEX IF EXISTS auth.oauth_consents_active_user_client_idx;
DROP INDEX IF EXISTS auth.oauth_consents_active_client_idx;
DROP INDEX IF EXISTS auth.oauth_clients_deleted_at_idx;
DROP INDEX IF EXISTS auth.oauth_auth_pending_exp_idx;
DROP INDEX IF EXISTS auth.mfa_recovery_codes_set_id_idx;
DROP INDEX IF EXISTS auth.mfa_factors_user_id_idx;
DROP INDEX IF EXISTS auth.mfa_factors_user_friendly_name_unique;
DROP INDEX IF EXISTS auth.mfa_challenge_created_at_idx;
DROP INDEX IF EXISTS auth.idx_users_name;
DROP INDEX IF EXISTS auth.idx_users_last_sign_in_at_desc;
DROP INDEX IF EXISTS auth.idx_users_email;
DROP INDEX IF EXISTS auth.idx_users_created_at_desc;
DROP INDEX IF EXISTS auth.idx_user_id_auth_method;
DROP INDEX IF EXISTS auth.idx_oauth_client_states_created_at;
DROP INDEX IF EXISTS auth.idx_auth_code;
DROP INDEX IF EXISTS auth.identities_user_id_idx;
DROP INDEX IF EXISTS auth.identities_email_idx;
DROP INDEX IF EXISTS auth.flow_state_created_at_idx;
DROP INDEX IF EXISTS auth.factor_id_created_at_idx;
DROP INDEX IF EXISTS auth.email_change_token_new_idx;
DROP INDEX IF EXISTS auth.email_change_token_current_idx;
DROP INDEX IF EXISTS auth.custom_oauth_providers_provider_type_idx;
DROP INDEX IF EXISTS auth.custom_oauth_providers_identifier_idx;
DROP INDEX IF EXISTS auth.custom_oauth_providers_enabled_idx;
DROP INDEX IF EXISTS auth.custom_oauth_providers_created_at_idx;
DROP INDEX IF EXISTS auth.confirmation_token_idx;
DROP INDEX IF EXISTS auth.audit_logs_instance_id_idx;
ALTER TABLE IF EXISTS ONLY storage.vector_indexes DROP CONSTRAINT IF EXISTS vector_indexes_pkey;
ALTER TABLE IF EXISTS ONLY storage.s3_multipart_uploads DROP CONSTRAINT IF EXISTS s3_multipart_uploads_pkey;
ALTER TABLE IF EXISTS ONLY storage.s3_multipart_uploads_parts DROP CONSTRAINT IF EXISTS s3_multipart_uploads_parts_pkey;
ALTER TABLE IF EXISTS ONLY storage.objects DROP CONSTRAINT IF EXISTS objects_pkey;
ALTER TABLE IF EXISTS ONLY storage.migrations DROP CONSTRAINT IF EXISTS migrations_pkey;
ALTER TABLE IF EXISTS ONLY storage.migrations DROP CONSTRAINT IF EXISTS migrations_name_key;
ALTER TABLE IF EXISTS ONLY storage.buckets_vectors DROP CONSTRAINT IF EXISTS buckets_vectors_pkey;
ALTER TABLE IF EXISTS ONLY storage.buckets DROP CONSTRAINT IF EXISTS buckets_pkey;
ALTER TABLE IF EXISTS ONLY storage.buckets_analytics DROP CONSTRAINT IF EXISTS buckets_analytics_pkey;
ALTER TABLE IF EXISTS ONLY realtime.schema_migrations DROP CONSTRAINT IF EXISTS schema_migrations_pkey;
ALTER TABLE IF EXISTS ONLY realtime.subscription DROP CONSTRAINT IF EXISTS pk_subscription;
ALTER TABLE IF EXISTS ONLY realtime.messages DROP CONSTRAINT IF EXISTS messages_pkey;
ALTER TABLE IF EXISTS realtime.messages DROP CONSTRAINT IF EXISTS messages_payload_exclusive;
ALTER TABLE IF EXISTS ONLY public.promotions_usocupon DROP CONSTRAINT IF EXISTS uso_cupon_unico_por_pedido;
ALTER TABLE IF EXISTS ONLY public.token_blacklist_outstandingtoken DROP CONSTRAINT IF EXISTS token_blacklist_outstandingtoken_pkey;
ALTER TABLE IF EXISTS ONLY public.token_blacklist_outstandingtoken DROP CONSTRAINT IF EXISTS token_blacklist_outstandingtoken_jti_hex_d9bdf6f7_uniq;
ALTER TABLE IF EXISTS ONLY public.token_blacklist_blacklistedtoken DROP CONSTRAINT IF EXISTS token_blacklist_blacklistedtoken_token_id_key;
ALTER TABLE IF EXISTS ONLY public.token_blacklist_blacklistedtoken DROP CONSTRAINT IF EXISTS token_blacklist_blacklistedtoken_pkey;
ALTER TABLE IF EXISTS ONLY public.reviews_resena DROP CONSTRAINT IF EXISTS reviews_resena_pkey;
ALTER TABLE IF EXISTS ONLY public.reviews_resena DROP CONSTRAINT IF EXISTS resena_unica_por_usuario_y_puesto;
ALTER TABLE IF EXISTS ONLY public.catalog_puestocategoria DROP CONSTRAINT IF EXISTS puesto_categoria_unica;
ALTER TABLE IF EXISTS ONLY public.promotions_usocupon DROP CONSTRAINT IF EXISTS promotions_usocupon_pkey;
ALTER TABLE IF EXISTS ONLY public.promotions_cupon DROP CONSTRAINT IF EXISTS promotions_cupon_pkey;
ALTER TABLE IF EXISTS ONLY public.promotions_cupon DROP CONSTRAINT IF EXISTS promotions_cupon_codigo_key;
ALTER TABLE IF EXISTS ONLY public.payments_pago DROP CONSTRAINT IF EXISTS payments_pago_pkey;
ALTER TABLE IF EXISTS ONLY public.payments_pago DROP CONSTRAINT IF EXISTS payments_pago_id_pedido_id_key;
ALTER TABLE IF EXISTS ONLY public.orders_pedido DROP CONSTRAINT IF EXISTS orders_pedido_pkey;
ALTER TABLE IF EXISTS ONLY public.orders_itempedido DROP CONSTRAINT IF EXISTS orders_itempedido_pkey;
ALTER TABLE IF EXISTS ONLY public.notifications_notificacion DROP CONSTRAINT IF EXISTS notifications_notificacion_pkey;
ALTER TABLE IF EXISTS ONLY public.orders_itempedido DROP CONSTRAINT IF EXISTS itempedido_producto_unico_por_pedido;
ALTER TABLE IF EXISTS ONLY public.django_session DROP CONSTRAINT IF EXISTS django_session_pkey;
ALTER TABLE IF EXISTS ONLY public.django_migrations DROP CONSTRAINT IF EXISTS django_migrations_pkey;
ALTER TABLE IF EXISTS ONLY public.django_content_type DROP CONSTRAINT IF EXISTS django_content_type_pkey;
ALTER TABLE IF EXISTS ONLY public.django_content_type DROP CONSTRAINT IF EXISTS django_content_type_app_label_model_76bd3d3b_uniq;
ALTER TABLE IF EXISTS ONLY public.django_admin_log DROP CONSTRAINT IF EXISTS django_admin_log_pkey;
ALTER TABLE IF EXISTS ONLY public.catalog_puestocategoria DROP CONSTRAINT IF EXISTS catalog_puestocategoria_pkey;
ALTER TABLE IF EXISTS ONLY public.catalog_puesto DROP CONSTRAINT IF EXISTS catalog_puesto_pkey;
ALTER TABLE IF EXISTS ONLY public.catalog_producto DROP CONSTRAINT IF EXISTS catalog_producto_pkey;
ALTER TABLE IF EXISTS ONLY public.catalog_imagenproducto DROP CONSTRAINT IF EXISTS catalog_imagenproducto_pkey;
ALTER TABLE IF EXISTS ONLY public.catalog_categoria DROP CONSTRAINT IF EXISTS catalog_categoria_pkey;
ALTER TABLE IF EXISTS ONLY public.catalog_categoria DROP CONSTRAINT IF EXISTS catalog_categoria_nombre_key;
ALTER TABLE IF EXISTS ONLY public.auth_permission DROP CONSTRAINT IF EXISTS auth_permission_pkey;
ALTER TABLE IF EXISTS ONLY public.auth_permission DROP CONSTRAINT IF EXISTS auth_permission_content_type_id_codename_01ab375a_uniq;
ALTER TABLE IF EXISTS ONLY public.auth_group DROP CONSTRAINT IF EXISTS auth_group_pkey;
ALTER TABLE IF EXISTS ONLY public.auth_group_permissions DROP CONSTRAINT IF EXISTS auth_group_permissions_pkey;
ALTER TABLE IF EXISTS ONLY public.auth_group_permissions DROP CONSTRAINT IF EXISTS auth_group_permissions_group_id_permission_id_0cd325b0_uniq;
ALTER TABLE IF EXISTS ONLY public.auth_group DROP CONSTRAINT IF EXISTS auth_group_name_key;
ALTER TABLE IF EXISTS ONLY public.audit_registroauditoria DROP CONSTRAINT IF EXISTS audit_registroauditoria_pkey;
ALTER TABLE IF EXISTS ONLY public.addresses_direccion DROP CONSTRAINT IF EXISTS addresses_direccion_pkey;
ALTER TABLE IF EXISTS ONLY public.accounts_vendedor DROP CONSTRAINT IF EXISTS accounts_vendedor_pkey;
ALTER TABLE IF EXISTS ONLY public.accounts_vendedor DROP CONSTRAINT IF EXISTS accounts_vendedor_id_usuario_id_key;
ALTER TABLE IF EXISTS ONLY public.accounts_vendedor DROP CONSTRAINT IF EXISTS accounts_vendedor_cedula_huella_key;
ALTER TABLE IF EXISTS ONLY public.accounts_usuario_user_permissions DROP CONSTRAINT IF EXISTS accounts_usuario_user_permissions_pkey;
ALTER TABLE IF EXISTS ONLY public.accounts_usuario_user_permissions DROP CONSTRAINT IF EXISTS accounts_usuario_user_pe_usuario_id_permission_id_0065a2ce_uniq;
ALTER TABLE IF EXISTS ONLY public.accounts_usuario DROP CONSTRAINT IF EXISTS accounts_usuario_pkey;
ALTER TABLE IF EXISTS ONLY public.accounts_usuario_groups DROP CONSTRAINT IF EXISTS accounts_usuario_groups_usuario_id_group_id_90f476d3_uniq;
ALTER TABLE IF EXISTS ONLY public.accounts_usuario_groups DROP CONSTRAINT IF EXISTS accounts_usuario_groups_pkey;
ALTER TABLE IF EXISTS ONLY public.accounts_usuario DROP CONSTRAINT IF EXISTS accounts_usuario_correo_key;
ALTER TABLE IF EXISTS ONLY public.accounts_usuario DROP CONSTRAINT IF EXISTS accounts_usuario_celular_key;
ALTER TABLE IF EXISTS ONLY auth.webauthn_credentials DROP CONSTRAINT IF EXISTS webauthn_credentials_pkey;
ALTER TABLE IF EXISTS ONLY auth.webauthn_challenges DROP CONSTRAINT IF EXISTS webauthn_challenges_pkey;
ALTER TABLE IF EXISTS ONLY auth.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY auth.users DROP CONSTRAINT IF EXISTS users_phone_key;
ALTER TABLE IF EXISTS ONLY auth.sso_providers DROP CONSTRAINT IF EXISTS sso_providers_pkey;
ALTER TABLE IF EXISTS ONLY auth.sso_domains DROP CONSTRAINT IF EXISTS sso_domains_pkey;
ALTER TABLE IF EXISTS ONLY auth.sessions DROP CONSTRAINT IF EXISTS sessions_pkey;
ALTER TABLE IF EXISTS ONLY auth.scim_users DROP CONSTRAINT IF EXISTS scim_users_pkey;
ALTER TABLE IF EXISTS ONLY auth.scim_tokens DROP CONSTRAINT IF EXISTS scim_tokens_pkey;
ALTER TABLE IF EXISTS ONLY auth.schema_migrations DROP CONSTRAINT IF EXISTS schema_migrations_pkey;
ALTER TABLE IF EXISTS ONLY auth.saml_relay_states DROP CONSTRAINT IF EXISTS saml_relay_states_pkey;
ALTER TABLE IF EXISTS ONLY auth.saml_providers DROP CONSTRAINT IF EXISTS saml_providers_pkey;
ALTER TABLE IF EXISTS ONLY auth.saml_providers DROP CONSTRAINT IF EXISTS saml_providers_entity_id_key;
ALTER TABLE IF EXISTS ONLY auth.refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_token_unique;
ALTER TABLE IF EXISTS ONLY auth.refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_pkey;
ALTER TABLE IF EXISTS ONLY auth.one_time_tokens DROP CONSTRAINT IF EXISTS one_time_tokens_pkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_consents DROP CONSTRAINT IF EXISTS oauth_consents_user_client_unique;
ALTER TABLE IF EXISTS ONLY auth.oauth_consents DROP CONSTRAINT IF EXISTS oauth_consents_pkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_clients DROP CONSTRAINT IF EXISTS oauth_clients_pkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_client_states DROP CONSTRAINT IF EXISTS oauth_client_states_pkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_authorizations DROP CONSTRAINT IF EXISTS oauth_authorizations_pkey;
ALTER TABLE IF EXISTS ONLY auth.oauth_authorizations DROP CONSTRAINT IF EXISTS oauth_authorizations_authorization_id_key;
ALTER TABLE IF EXISTS ONLY auth.oauth_authorizations DROP CONSTRAINT IF EXISTS oauth_authorizations_authorization_code_key;
ALTER TABLE IF EXISTS ONLY auth.mfa_recovery_codes DROP CONSTRAINT IF EXISTS mfa_recovery_codes_pkey;
ALTER TABLE IF EXISTS ONLY auth.mfa_recovery_code_sets DROP CONSTRAINT IF EXISTS mfa_recovery_code_sets_user_id_key;
ALTER TABLE IF EXISTS ONLY auth.mfa_recovery_code_sets DROP CONSTRAINT IF EXISTS mfa_recovery_code_sets_pkey;
ALTER TABLE IF EXISTS ONLY auth.mfa_recovery_code_sets DROP CONSTRAINT IF EXISTS mfa_recovery_code_sets_mfa_factor_id_key;
ALTER TABLE IF EXISTS ONLY auth.mfa_factors DROP CONSTRAINT IF EXISTS mfa_factors_pkey;
ALTER TABLE IF EXISTS ONLY auth.mfa_factors DROP CONSTRAINT IF EXISTS mfa_factors_last_challenged_at_key;
ALTER TABLE IF EXISTS ONLY auth.mfa_challenges DROP CONSTRAINT IF EXISTS mfa_challenges_pkey;
ALTER TABLE IF EXISTS ONLY auth.mfa_amr_claims DROP CONSTRAINT IF EXISTS mfa_amr_claims_session_id_authentication_method_pkey;
ALTER TABLE IF EXISTS ONLY auth.instances DROP CONSTRAINT IF EXISTS instances_pkey;
ALTER TABLE IF EXISTS ONLY auth.identities DROP CONSTRAINT IF EXISTS identities_provider_id_provider_unique;
ALTER TABLE IF EXISTS ONLY auth.identities DROP CONSTRAINT IF EXISTS identities_pkey;
ALTER TABLE IF EXISTS ONLY auth.flow_state DROP CONSTRAINT IF EXISTS flow_state_pkey;
ALTER TABLE IF EXISTS ONLY auth.custom_oauth_providers DROP CONSTRAINT IF EXISTS custom_oauth_providers_pkey;
ALTER TABLE IF EXISTS ONLY auth.custom_oauth_providers DROP CONSTRAINT IF EXISTS custom_oauth_providers_identifier_key;
ALTER TABLE IF EXISTS ONLY auth.audit_log_entries DROP CONSTRAINT IF EXISTS audit_log_entries_pkey;
ALTER TABLE IF EXISTS ONLY auth.mfa_amr_claims DROP CONSTRAINT IF EXISTS amr_id_pk;
ALTER TABLE IF EXISTS auth.refresh_tokens ALTER COLUMN id DROP DEFAULT;
DROP TABLE IF EXISTS storage.vector_indexes;
DROP TABLE IF EXISTS storage.s3_multipart_uploads_parts;
DROP TABLE IF EXISTS storage.s3_multipart_uploads;
DROP TABLE IF EXISTS storage.objects;
DROP TABLE IF EXISTS storage.migrations;
DROP TABLE IF EXISTS storage.buckets_vectors;
DROP TABLE IF EXISTS storage.buckets_analytics;
DROP TABLE IF EXISTS storage.buckets;
DROP TABLE IF EXISTS realtime.subscription;
DROP TABLE IF EXISTS realtime.schema_migrations;
DROP TABLE IF EXISTS realtime.messages;
DROP TABLE IF EXISTS public.token_blacklist_outstandingtoken;
DROP TABLE IF EXISTS public.token_blacklist_blacklistedtoken;
DROP TABLE IF EXISTS public.reviews_resena;
DROP TABLE IF EXISTS public.promotions_usocupon;
DROP TABLE IF EXISTS public.promotions_cupon;
DROP TABLE IF EXISTS public.payments_pago;
DROP TABLE IF EXISTS public.orders_pedido;
DROP TABLE IF EXISTS public.orders_itempedido;
DROP TABLE IF EXISTS public.notifications_notificacion;
DROP TABLE IF EXISTS public.django_session;
DROP TABLE IF EXISTS public.django_migrations;
DROP TABLE IF EXISTS public.django_content_type;
DROP TABLE IF EXISTS public.django_admin_log;
DROP TABLE IF EXISTS public.catalog_puestocategoria;
DROP TABLE IF EXISTS public.catalog_puesto;
DROP TABLE IF EXISTS public.catalog_producto;
DROP TABLE IF EXISTS public.catalog_imagenproducto;
DROP TABLE IF EXISTS public.catalog_categoria;
DROP TABLE IF EXISTS public.auth_permission;
DROP TABLE IF EXISTS public.auth_group_permissions;
DROP TABLE IF EXISTS public.auth_group;
DROP TABLE IF EXISTS public.audit_registroauditoria;
DROP TABLE IF EXISTS public.addresses_direccion;
DROP TABLE IF EXISTS public.accounts_vendedor;
DROP TABLE IF EXISTS public.accounts_usuario_user_permissions;
DROP TABLE IF EXISTS public.accounts_usuario_groups;
DROP TABLE IF EXISTS public.accounts_usuario;
DROP TABLE IF EXISTS auth.webauthn_credentials;
DROP TABLE IF EXISTS auth.webauthn_challenges;
DROP TABLE IF EXISTS auth.users;
DROP TABLE IF EXISTS auth.sso_providers;
DROP TABLE IF EXISTS auth.sso_domains;
DROP TABLE IF EXISTS auth.sessions;
DROP TABLE IF EXISTS auth.scim_users;
DROP TABLE IF EXISTS auth.scim_tokens;
DROP TABLE IF EXISTS auth.schema_migrations;
DROP TABLE IF EXISTS auth.saml_relay_states;
DROP TABLE IF EXISTS auth.saml_providers;
DROP SEQUENCE IF EXISTS auth.refresh_tokens_id_seq;
DROP TABLE IF EXISTS auth.refresh_tokens;
DROP TABLE IF EXISTS auth.one_time_tokens;
DROP TABLE IF EXISTS auth.oauth_consents;
DROP TABLE IF EXISTS auth.oauth_clients;
DROP TABLE IF EXISTS auth.oauth_client_states;
DROP TABLE IF EXISTS auth.oauth_authorizations;
DROP TABLE IF EXISTS auth.mfa_recovery_codes;
DROP TABLE IF EXISTS auth.mfa_recovery_code_sets;
DROP TABLE IF EXISTS auth.mfa_factors;
DROP TABLE IF EXISTS auth.mfa_challenges;
DROP TABLE IF EXISTS auth.mfa_amr_claims;
DROP TABLE IF EXISTS auth.instances;
DROP TABLE IF EXISTS auth.identities;
DROP TABLE IF EXISTS auth.flow_state;
DROP TABLE IF EXISTS auth.custom_oauth_providers;
DROP TABLE IF EXISTS auth.audit_log_entries;
DROP FUNCTION IF EXISTS storage.update_updated_at_column();
DROP FUNCTION IF EXISTS storage.search_v2(prefix text, bucket_name text, limits integer, levels integer, start_after text, sort_order text, sort_column text, sort_column_after text, noncurrent_versions text, delete_markers text, start_after_archived_at timestamp with time zone, start_after_version text, start_after_is_continuation boolean);
DROP FUNCTION IF EXISTS storage.search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text, noncurrent_versions text, delete_markers text, p_start_after_version text);
DROP FUNCTION IF EXISTS storage.search(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text, noncurrent_versions text, delete_markers text);
DROP FUNCTION IF EXISTS storage.protect_delete();
DROP FUNCTION IF EXISTS storage.protect_bucket_control_columns();
DROP FUNCTION IF EXISTS storage.operation();
DROP FUNCTION IF EXISTS storage.list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer, start_after text, next_token text, sort_order text, noncurrent_versions text, delete_markers text, next_token_archived_at timestamp with time zone, next_token_version text);
DROP FUNCTION IF EXISTS storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, next_key_token text, next_upload_token text, raw_prefix_param text);
DROP FUNCTION IF EXISTS storage.get_size_by_bucket(noncurrent_versions text, delete_markers text);
DROP FUNCTION IF EXISTS storage.get_common_prefix(p_key text, p_prefix text, p_delimiter text);
DROP FUNCTION IF EXISTS storage.foldername(name text);
DROP FUNCTION IF EXISTS storage.filename(name text);
DROP FUNCTION IF EXISTS storage.extension(name text);
DROP FUNCTION IF EXISTS storage.enforce_bucket_name_length();
DROP FUNCTION IF EXISTS storage.enforce_bucket_lifecycle_service_role();
DROP FUNCTION IF EXISTS storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb);
DROP FUNCTION IF EXISTS storage.allow_only_operation(expected_operation text);
DROP FUNCTION IF EXISTS storage.allow_any_operation(expected_operations text[]);
DROP FUNCTION IF EXISTS realtime.wal2json_escape_identifier(name text);
DROP FUNCTION IF EXISTS realtime.topic();
DROP FUNCTION IF EXISTS realtime.to_regrole(role_name text);
DROP FUNCTION IF EXISTS realtime.subscription_check_filters();
DROP FUNCTION IF EXISTS realtime.settled_changes(slot_name name, max_changes integer, VARIADIC opts text[]);
DROP FUNCTION IF EXISTS realtime.send_binary(payload bytea, event text, topic text, private boolean);
DROP FUNCTION IF EXISTS realtime.send(payload jsonb, event text, topic text, private boolean);
DROP FUNCTION IF EXISTS realtime.quote_wal2json(entity regclass);
DROP FUNCTION IF EXISTS realtime.list_changes_sync(publication name, slot_name name, max_changes integer, max_record_bytes integer);
DROP FUNCTION IF EXISTS realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer);
DROP FUNCTION IF EXISTS realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]);
DROP FUNCTION IF EXISTS realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text, negate boolean);
DROP FUNCTION IF EXISTS realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text);
DROP FUNCTION IF EXISTS realtime."cast"(val text, type_ regtype);
DROP FUNCTION IF EXISTS realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]);
DROP FUNCTION IF EXISTS realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text);
DROP FUNCTION IF EXISTS realtime.authorize(role_name text, topic_name text, claims text, sub text, headers text, read_extensions text[], write_extensions text[], OUT read_allowed boolean[], OUT write_allowed boolean[]);
DROP FUNCTION IF EXISTS realtime.apply_rls(wal jsonb, max_record_bytes integer);
DROP FUNCTION IF EXISTS public.rls_auto_enable();
DROP FUNCTION IF EXISTS pgbouncer.get_auth(p_usename text);
DROP FUNCTION IF EXISTS graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb);
DROP FUNCTION IF EXISTS extensions.set_graphql_placeholder();
DROP FUNCTION IF EXISTS extensions.pgrst_drop_watch();
DROP FUNCTION IF EXISTS extensions.pgrst_ddl_watch();
DROP FUNCTION IF EXISTS extensions.grant_pg_net_access();
DROP FUNCTION IF EXISTS extensions.grant_pg_graphql_access();
DROP FUNCTION IF EXISTS extensions.grant_pg_cron_access();
DROP FUNCTION IF EXISTS auth.uid();
DROP FUNCTION IF EXISTS auth.role();
DROP FUNCTION IF EXISTS auth.jwt();
DROP FUNCTION IF EXISTS auth.email();
DROP TYPE IF EXISTS storage.buckettype;
DROP TYPE IF EXISTS realtime.wal_rls;
DROP TYPE IF EXISTS realtime.wal_column;
DROP TYPE IF EXISTS realtime.user_defined_filter;
DROP TYPE IF EXISTS realtime.equality_op;
DROP TYPE IF EXISTS realtime.action;
DROP TYPE IF EXISTS auth.one_time_token_type;
DROP TYPE IF EXISTS auth.oauth_response_type;
DROP TYPE IF EXISTS auth.oauth_registration_type;
DROP TYPE IF EXISTS auth.oauth_client_type;
DROP TYPE IF EXISTS auth.oauth_authorization_status;
DROP TYPE IF EXISTS auth.factor_type;
DROP TYPE IF EXISTS auth.factor_status;
DROP TYPE IF EXISTS auth.code_challenge_method;
DROP TYPE IF EXISTS auth.aal_level;
DROP EXTENSION IF EXISTS "uuid-ossp";
DROP EXTENSION IF EXISTS supabase_vault;
DROP EXTENSION IF EXISTS pgcrypto;
DROP EXTENSION IF EXISTS pg_stat_statements;
DROP SCHEMA IF EXISTS vault;
DROP SCHEMA IF EXISTS storage;
DROP SCHEMA IF EXISTS realtime;
DROP SCHEMA IF EXISTS pgbouncer;
DROP SCHEMA IF EXISTS graphql_public;
DROP SCHEMA IF EXISTS graphql;
DROP SCHEMA IF EXISTS extensions;
DROP SCHEMA IF EXISTS auth;
--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA auth;


--
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA extensions;


--
-- Name: graphql; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA graphql;


--
-- Name: graphql_public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA graphql_public;


--
-- Name: pgbouncer; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA pgbouncer;


--
-- Name: realtime; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA realtime;


--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA storage;


--
-- Name: vault; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA vault;


--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: supabase_vault; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;


--
-- Name: EXTENSION supabase_vault; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION supabase_vault IS 'Supabase Vault Extension';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.aal_level AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


--
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.code_challenge_method AS ENUM (
    's256',
    'plain'
);


--
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_status AS ENUM (
    'unverified',
    'verified'
);


--
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_type AS ENUM (
    'totp',
    'webauthn',
    'phone',
    'recovery_code'
);


--
-- Name: oauth_authorization_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_authorization_status AS ENUM (
    'pending',
    'approved',
    'denied',
    'expired'
);


--
-- Name: oauth_client_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_client_type AS ENUM (
    'public',
    'confidential'
);


--
-- Name: oauth_registration_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_registration_type AS ENUM (
    'dynamic',
    'manual'
);


--
-- Name: oauth_response_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_response_type AS ENUM (
    'code'
);


--
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.one_time_token_type AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


--
-- Name: action; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.action AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'TRUNCATE',
    'ERROR'
);


--
-- Name: equality_op; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.equality_op AS ENUM (
    'eq',
    'neq',
    'lt',
    'lte',
    'gt',
    'gte',
    'in',
    'like',
    'ilike',
    'is',
    'match',
    'imatch',
    'isdistinct'
);


--
-- Name: user_defined_filter; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.user_defined_filter AS (
	column_name text,
	op realtime.equality_op,
	value text,
	negate boolean
);


--
-- Name: wal_column; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.wal_column AS (
	name text,
	type_name text,
	type_oid oid,
	value jsonb,
	is_pkey boolean,
	is_selectable boolean
);


--
-- Name: wal_rls; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.wal_rls AS (
	wal jsonb,
	is_rls_enabled boolean,
	subscription_ids uuid[],
	errors text[]
);


--
-- Name: buckettype; Type: TYPE; Schema: storage; Owner: -
--

CREATE TYPE storage.buckettype AS ENUM (
    'STANDARD',
    'ANALYTICS',
    'VECTOR'
);


--
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.email() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


--
-- Name: FUNCTION email(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.email() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';


--
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


--
-- Name: FUNCTION role(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.role() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';


--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


--
-- Name: FUNCTION uid(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.uid() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';


--
-- Name: grant_pg_cron_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_cron_access() RETURNS event_trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  IF EXISTS (
    SELECT
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_cron'
  )
  THEN
    grant usage on schema cron to postgres with grant option;

    alter default privileges in schema cron grant all on tables to postgres with grant option;
    alter default privileges in schema cron grant all on functions to postgres with grant option;
    alter default privileges in schema cron grant all on sequences to postgres with grant option;

    alter default privileges for user supabase_admin in schema cron grant all
        on sequences to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on tables to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on functions to postgres with grant option;

    grant all privileges on all tables in schema cron to postgres with grant option;
    revoke all on table cron.job from postgres;
    grant select on table cron.job to postgres with grant option;
    revoke trigger on cron.job_run_details from postgres;
  END IF;
END;
$$;


--
-- Name: FUNCTION grant_pg_cron_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_cron_access() IS 'Grants access to pg_cron';


--
-- Name: grant_pg_graphql_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_graphql_access() RETURNS event_trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $_$
begin
    if not exists (
        select 1
        from pg_catalog.pg_event_trigger_ddl_commands() ev
        join pg_catalog.pg_extension e on ev.objid = e.oid
        where e.extname = 'pg_graphql'
    ) then
        return;
    end if;

    drop function if exists graphql_public.graphql;
    create or replace function graphql_public.graphql(
        "operationName" text default null,
        query text default null,
        variables jsonb default null,
        extensions jsonb default null
    )
        returns jsonb
        language sql
    as $$
        select graphql.resolve(
            query := query,
            variables := coalesce(variables, '{}'),
            "operationName" := "operationName",
            extensions := extensions
        );
    $$;

    -- Attach the wrapper to the extension so DROP EXTENSION cascades to it,
    -- which in turn triggers set_graphql_placeholder to reinstall the "not enabled" stub.
    alter extension pg_graphql add function graphql_public.graphql(text, text, jsonb, jsonb);

    grant usage on schema graphql to postgres, anon, authenticated, service_role;
    grant execute on function graphql.resolve to postgres, anon, authenticated, service_role;
    grant usage on schema graphql to postgres with grant option;
    grant usage on schema graphql_public to postgres with grant option;
end;
$_$;


--
-- Name: FUNCTION grant_pg_graphql_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_graphql_access() IS 'Grants access to pg_graphql';


--
-- Name: grant_pg_net_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_net_access() RETURNS event_trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_net'
  )
  THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_roles
      WHERE rolname = 'supabase_functions_admin'
    )
    THEN
      CREATE USER supabase_functions_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;
    END IF;

    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;

    IF EXISTS (
      SELECT FROM pg_extension
      WHERE extname = 'pg_net'
      -- all versions in use on existing projects as of 2025-02-20
      -- version 0.12.0 onwards don't need these applied
      AND extversion IN ('0.2', '0.6', '0.7', '0.7.1', '0.8.0', '0.10.0', '0.11.0')
    ) THEN
      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;

      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;

      REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
      REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;

      GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
    END IF;
  END IF;
END;
$$;


--
-- Name: FUNCTION grant_pg_net_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_net_access() IS 'Grants access to pg_net';


--
-- Name: pgrst_ddl_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.pgrst_ddl_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF cmd.command_tag IN (
      'CREATE SCHEMA', 'ALTER SCHEMA'
    , 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE'
    , 'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE'
    , 'CREATE VIEW', 'ALTER VIEW'
    , 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW'
    , 'CREATE FUNCTION', 'ALTER FUNCTION'
    , 'CREATE TRIGGER'
    , 'CREATE TYPE', 'ALTER TYPE'
    , 'CREATE RULE'
    , 'COMMENT'
    )
    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp
    AND cmd.schema_name is distinct from 'pg_temp'
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


--
-- Name: pgrst_drop_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.pgrst_drop_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    IF obj.object_type IN (
      'schema'
    , 'table'
    , 'foreign table'
    , 'view'
    , 'materialized view'
    , 'function'
    , 'trigger'
    , 'type'
    , 'rule'
    )
    AND obj.is_temporary IS false -- no pg_temp objects
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


--
-- Name: set_graphql_placeholder(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.set_graphql_placeholder() RETURNS event_trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $_$
    DECLARE
    graphql_is_dropped bool;
    BEGIN
    graphql_is_dropped = (
        SELECT ev.schema_name = 'graphql_public'
        FROM pg_event_trigger_dropped_objects() AS ev
        WHERE ev.schema_name = 'graphql_public'
    );

    IF graphql_is_dropped
    THEN
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language plpgsql
            set search_path to ''
        as $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;
    END IF;

    END;
$_$;


--
-- Name: FUNCTION set_graphql_placeholder(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.set_graphql_placeholder() IS 'Reintroduces placeholder function for graphql_public.graphql';


--
-- Name: graphql(text, text, jsonb, jsonb); Type: FUNCTION; Schema: graphql_public; Owner: -
--

CREATE FUNCTION graphql_public.graphql("operationName" text DEFAULT NULL::text, query text DEFAULT NULL::text, variables jsonb DEFAULT NULL::jsonb, extensions jsonb DEFAULT NULL::jsonb) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;


--
-- Name: get_auth(text); Type: FUNCTION; Schema: pgbouncer; Owner: -
--

CREATE FUNCTION pgbouncer.get_auth(p_usename text) RETURNS TABLE(username text, password text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
  BEGIN
      RAISE DEBUG 'PgBouncer auth request: %', p_usename;

      RETURN QUERY
      SELECT
          rolname::text,
          CASE WHEN rolvaliduntil < now()
              THEN null
              ELSE rolpassword::text
          END
      FROM pg_authid
      WHERE rolname=$1 and rolcanlogin;
  END;
  $_$;


--
-- Name: rls_auto_enable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
  tbl name;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        SELECT c.relname INTO tbl FROM pg_catalog.pg_class c WHERE c.oid = cmd.objid;
        EXECUTE format('alter table if exists %I.%I enable row level security', cmd.schema_name, tbl);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


--
-- Name: apply_rls(jsonb, integer); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer DEFAULT (1024 * 1024)) RETURNS SETOF realtime.wal_rls
    LANGUAGE plpgsql
    AS $$
declare
    -- Regclass of the table e.g. public.notes
    entity_ regclass = (quote_ident(wal ->> 'schema') || '.' || quote_ident(wal ->> 'table'))::regclass;

    -- I, U, D, T: insert, update ...
    action realtime.action = (
        case wal ->> 'action'
            when 'I' then 'INSERT'
            when 'U' then 'UPDATE'
            when 'D' then 'DELETE'
            else 'ERROR'
        end
    );

    -- Is row level security enabled for the table
    is_rls_enabled bool = relrowsecurity from pg_class where oid = entity_;

    subscriptions realtime.subscription[] = array_agg(subs)
        from
            realtime.subscription subs
        where
            subs.entity = entity_
            -- Filter by action early - only get subscriptions interested in this action
            -- action_filter column can be: '*' (all), 'INSERT', 'UPDATE', or 'DELETE'
            and (subs.action_filter = '*' or subs.action_filter = action::text);

    -- Subscription vars
    working_role regrole;
    working_selected_columns text[];
    claimed_role regrole;
    claims jsonb;

    subscription_id uuid;
    subscription_has_access bool;
    visible_to_subscription_ids uuid[] = '{}';

    -- structured info for wal's columns
    columns realtime.wal_column[];
    -- previous identity values for update/delete
    old_columns realtime.wal_column[];

    error_record_exceeds_max_size boolean = octet_length(wal::text) > max_record_bytes;

    -- Primary jsonb output for record
    output jsonb;

    -- Loop record for iterating unique roles (outer loop)
    role_record record;
    -- Loop record for iterating unique selected_columns within a role (inner loop)
    cols_record record;
    -- Subscription ids visible at the role level (before fanning out by selected_columns)
    visible_role_sub_ids uuid[] = '{}';

begin
    perform set_config('role', null, true);

    columns =
        array_agg(
            (
                x->>'name',
                x->>'type',
                x->>'typeoid',
                realtime.cast(
                    (x->'value') #>> '{}',
                    coalesce(
                        (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                        (x->>'type')::regtype
                    )
                ),
                (pks ->> 'name') is not null,
                true
            )::realtime.wal_column
        )
        from
            jsonb_array_elements(wal -> 'columns') x
            left join jsonb_array_elements(wal -> 'pk') pks
                on (x ->> 'name') = (pks ->> 'name');

    old_columns =
        array_agg(
            (
                x->>'name',
                x->>'type',
                x->>'typeoid',
                realtime.cast(
                    (x->'value') #>> '{}',
                    coalesce(
                        (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                        (x->>'type')::regtype
                    )
                ),
                (pks ->> 'name') is not null,
                true
            )::realtime.wal_column
        )
        from
            jsonb_array_elements(wal -> 'identity') x
            left join jsonb_array_elements(wal -> 'pk') pks
                on (x ->> 'name') = (pks ->> 'name');

    for role_record in
        select claims_role
        from (select distinct claims_role from unnest(subscriptions)) t
        order by claims_role::text
    loop
        working_role := role_record.claims_role;

        -- Update `is_selectable` for columns and old_columns (once per role)
        columns =
            array_agg(
                (
                    c.name,
                    c.type_name,
                    c.type_oid,
                    c.value,
                    c.is_pkey,
                    pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                )::realtime.wal_column
            )
            from
                unnest(columns) c;

        old_columns =
                array_agg(
                    (
                        c.name,
                        c.type_name,
                        c.type_oid,
                        c.value,
                        c.is_pkey,
                        pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                    )::realtime.wal_column
                )
                from
                    unnest(old_columns) c;

        if action <> 'DELETE' and count(1) = 0 from unnest(columns) c where c.is_pkey then
            -- Fan out 400 error per distinct selected_columns for this role
            for cols_record in
                select selected_columns
                from (select distinct selected_columns from unnest(subscriptions) s where s.claims_role = working_role) t
                order by coalesce(array_to_string(selected_columns, ','), '')
            loop
                working_selected_columns := cols_record.selected_columns;
                return next (
                    jsonb_build_object(
                        'schema', wal ->> 'schema',
                        'table', wal ->> 'table',
                        'type', action
                    ),
                    is_rls_enabled,
                    (select array_agg(s.subscription_id) from unnest(subscriptions) as s where s.claims_role = working_role and (s.selected_columns is not distinct from working_selected_columns)),
                    array['Error 400: Bad Request, no primary key']
                )::realtime.wal_rls;
            end loop;

        -- The claims role does not have SELECT permission to the primary key of entity
        elsif action <> 'DELETE' and sum(c.is_selectable::int) <> count(1) from unnest(columns) c where c.is_pkey then
            -- Fan out 401 error per distinct selected_columns for this role
            for cols_record in
                select selected_columns
                from (select distinct selected_columns from unnest(subscriptions) s where s.claims_role = working_role) t
                order by coalesce(array_to_string(selected_columns, ','), '')
            loop
                working_selected_columns := cols_record.selected_columns;
                return next (
                    jsonb_build_object(
                        'schema', wal ->> 'schema',
                        'table', wal ->> 'table',
                        'type', action
                    ),
                    is_rls_enabled,
                    (select array_agg(s.subscription_id) from unnest(subscriptions) as s where s.claims_role = working_role and (s.selected_columns is not distinct from working_selected_columns)),
                    array['Error 401: Unauthorized']
                )::realtime.wal_rls;
            end loop;

        else
            -- Create the prepared statement (once per role)
            if is_rls_enabled and action <> 'DELETE' then
                if (select 1 from pg_prepared_statements where name = 'walrus_rls_stmt' limit 1) > 0 then
                    deallocate walrus_rls_stmt;
                end if;
                execute realtime.build_prepared_statement_sql('walrus_rls_stmt', entity_, columns);
            end if;

            -- Collect all visible subscription IDs for this role (filter check + RLS check)
            visible_role_sub_ids = '{}';

            for subscription_id, claims in (
                    select
                        subs.subscription_id,
                        subs.claims
                    from
                        unnest(subscriptions) subs
                    where
                        subs.entity = entity_
                        and subs.claims_role = working_role
                        and (
                            realtime.is_visible_through_filters(columns, subs.filters)
                            or (
                              action = 'DELETE'
                              and realtime.is_visible_through_filters(old_columns, subs.filters)
                            )
                        )
            ) loop

                if not is_rls_enabled or action = 'DELETE' then
                    visible_role_sub_ids = visible_role_sub_ids || subscription_id;
                else
                    -- Check if RLS allows the role to see the record
                    perform
                        -- Trim leading and trailing quotes from working_role because set_config
                        -- doesn't recognize the role as valid if they are included
                        set_config('role', trim(both '"' from working_role::text), true),
                        set_config('request.jwt.claims', claims::text, true);

                    execute 'execute walrus_rls_stmt' into subscription_has_access;

                    -- Reset the role on every FOR..LOOP batch execution.
                    -- The first batch of 10 rows is pre-fetched using the current connection role (PG internal behaviour)
                    -- then we have to reset it again otherwise it would use the role defined in the `set_config` above
                    -- to fetch the remaining rows when rows>10, which could be a user-defined role that lacks execution grants.
                    -- The flow is:
                    --   1. run batch with conn role
                    --   2. set_config working_role
                    --   3. execute walrus
                    --   4. reset role (revert)
                    --   5. repeat
                    perform set_config('role', null, true);

                    if subscription_has_access then
                        visible_role_sub_ids = visible_role_sub_ids || subscription_id;
                    end if;
                end if;
            end loop;

            perform set_config('role', null, true);

            -- Inner loop: per distinct selected_columns for this role
            for cols_record in
                select selected_columns
                from (select distinct selected_columns from unnest(subscriptions) s where s.claims_role = working_role) t
                order by coalesce(array_to_string(selected_columns, ','), '')
            loop
                working_selected_columns := cols_record.selected_columns;

                output = jsonb_build_object(
                    'schema', wal ->> 'schema',
                    'table', wal ->> 'table',
                    'type', action,
                    'commit_timestamp', to_char(
                        ((wal ->> 'timestamp')::timestamptz at time zone 'utc'),
                        'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
                    ),
                    'columns', (
                        select
                            jsonb_agg(
                                jsonb_build_object(
                                    'name', pa.attname,
                                    'type', pt.typname
                                )
                                order by pa.attnum asc
                            )
                        from
                            pg_attribute pa
                            join pg_type pt
                                on pa.atttypid = pt.oid
                            left join (
                                select unnest(conkey) as pkey_attnum
                                from pg_constraint
                                where conrelid = entity_ and contype = 'p'
                            ) pk on pk.pkey_attnum = pa.attnum
                        where
                            attrelid = entity_
                            and attnum > 0
                            and pg_catalog.has_column_privilege(working_role, entity_, pa.attname, 'SELECT')
                            and (working_selected_columns is null or pa.attname = any(working_selected_columns) or pk.pkey_attnum is not null)
                    )
                )
                -- Add "record" key for insert and update
                || case
                    when action in ('INSERT', 'UPDATE') then
                        jsonb_build_object(
                            'record',
                            (
                                select
                                    jsonb_object_agg(
                                        -- if unchanged toast, get column name and value from old record
                                        coalesce((c).name, (oc).name),
                                        case
                                            when (c).name is null then (oc).value
                                            else (c).value
                                        end
                                    )
                                from
                                    unnest(columns) c
                                    full outer join unnest(old_columns) oc
                                        on (c).name = (oc).name
                                where
                                    coalesce((c).is_selectable, (oc).is_selectable)
                                    and (working_selected_columns is null or coalesce((c).name, (oc).name) = any(working_selected_columns) or coalesce((c).is_pkey, (oc).is_pkey))
                                    and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                            )
                        )
                    else '{}'::jsonb
                end
                -- Add "old_record" key for update and delete
                || case
                    when action = 'UPDATE' then
                        jsonb_build_object(
                                'old_record',
                                (
                                    select jsonb_object_agg((c).name, (c).value)
                                    from unnest(old_columns) c
                                    where
                                        (c).is_selectable
                                        and (working_selected_columns is null or (c).name = any(working_selected_columns) or (c).is_pkey)
                                        and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                                )
                            )
                    when action = 'DELETE' then
                        jsonb_build_object(
                            'old_record',
                            (
                                select jsonb_object_agg((c).name, (c).value)
                                from unnest(old_columns) c
                                where
                                    (c).is_selectable
                                    and (working_selected_columns is null or (c).name = any(working_selected_columns) or (c).is_pkey)
                                    and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                                    and ( not is_rls_enabled or (c).is_pkey ) -- if RLS enabled, we can't secure deletes so filter to pkey
                            )
                        )
                    else '{}'::jsonb
                end;

                -- Filter visible_role_sub_ids to those matching the current selected_columns group
                visible_to_subscription_ids = coalesce(
                    (
                        select array_agg(s.subscription_id)
                        from unnest(subscriptions) s
                        where s.claims_role = working_role
                          and (s.selected_columns is not distinct from working_selected_columns)
                          and s.subscription_id = any(visible_role_sub_ids)
                    ),
                    '{}'::uuid[]
                );

                return next (
                    output,
                    is_rls_enabled,
                    visible_to_subscription_ids,
                    case
                        when error_record_exceeds_max_size then array['Error 413: Payload Too Large']
                        else '{}'
                    end
                )::realtime.wal_rls;
            end loop;

        end if;
    end loop;

    perform set_config('role', null, true);
end;
$$;


--
-- Name: authorize(text, text, text, text, text, text[], text[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.authorize(role_name text, topic_name text, claims text, sub text, headers text, read_extensions text[], write_extensions text[], OUT read_allowed boolean[], OUT write_allowed boolean[]) RETURNS record
    LANGUAGE plpgsql
    AS $$
declare
  probe_ids uuid[];
  ext text;
  allowed boolean;
begin
  -- The probe inserts are rolled back, but they still give the transaction an xid, so it ends
  -- in a commit. Nothing durable was written, so skip waiting on the WAL flush and sync standbys.
  -- Set outside the block below, whose rollback would undo it.
  perform set_config('synchronous_commit', 'off', true);

  -- The RAISE at the end of this block rolls back everything in it.
  begin
    probe_ids := array(select gen_random_uuid() from unnest(read_extensions));

    insert into realtime.messages (id, topic, extension, inserted_at, updated_at)
    select p.id, topic_name, p.extension, now() at time zone 'utc', now() at time zone 'utc'
    from unnest(probe_ids, read_extensions) as p(id, extension);

    perform set_config('role', role_name, true),
            set_config('realtime.topic', topic_name, true),
            set_config('request.jwt.claims', claims, true),
            set_config('request.jwt.claim.sub', sub, true),
            set_config('request.jwt.claim.role', role_name, true),
            set_config('request.headers', headers, true);

    read_allowed := array(
      select exists(select 1 from realtime.messages m where m.id = p.id)
      from unnest(probe_ids) with ordinality as p(id, n)
      order by p.n);

    write_allowed := '{}';

    foreach ext in array write_extensions loop
      begin
        insert into realtime.messages (topic, extension, inserted_at, updated_at)
        values (topic_name, ext, now() at time zone 'utc', now() at time zone 'utc');

        allowed := true;
      exception when insufficient_privilege then
        allowed := false;
      end;

      write_allowed := write_allowed || allowed;
    end loop;

    raise sqlstate 'RTA01';
  exception when sqlstate 'RTA01' then
    null;
  end;
end;
$$;


--
-- Name: broadcast_changes(text, text, text, text, text, record, record, text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text DEFAULT 'ROW'::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    -- Declare a variable to hold the JSONB representation of the row
    row_data jsonb := '{}'::jsonb;
BEGIN
    IF level = 'STATEMENT' THEN
        RAISE EXCEPTION 'function can only be triggered for each row, not for each statement';
    END IF;
    -- Check the operation type and handle accordingly
    IF operation = 'INSERT' OR operation = 'UPDATE' OR operation = 'DELETE' THEN
        row_data := jsonb_build_object('old_record', OLD, 'record', NEW, 'operation', operation, 'table', table_name, 'schema', table_schema);
        PERFORM realtime.send (row_data, event_name, topic_name);
    ELSE
        RAISE EXCEPTION 'Unexpected operation type: %', operation;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to process the row: %', SQLERRM;
END;

$$;


--
-- Name: build_prepared_statement_sql(text, regclass, realtime.wal_column[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) RETURNS text
    LANGUAGE sql
    AS $$
      /*
      Builds a sql string that, if executed, creates a prepared statement to
      tests retrive a row from *entity* by its primary key columns.
      Example
          select realtime.build_prepared_statement_sql('public.notes', '{"id"}'::text[], '{"bigint"}'::text[])
      */
          select
      'prepare ' || prepared_statement_name || ' as
          select
              exists(
                  select
                      1
                  from
                      ' || entity || '
                  where
                      ' || string_agg(quote_ident(pkc.name) || '=' || quote_nullable(pkc.value #>> '{}') , ' and ') || '
              )'
          from
              unnest(columns) pkc
          where
              pkc.is_pkey
          group by
              entity
      $$;


--
-- Name: cast(text, regtype); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime."cast"(val text, type_ regtype) RETURNS jsonb
    LANGUAGE plpgsql IMMUTABLE
    AS $$
declare
  res jsonb;
begin
  if type_::text = 'bytea' then
    return to_jsonb(val);
  end if;
  execute format('select to_jsonb(%L::'|| type_::text || ')', val) into res;
  return res;
end
$$;


--
-- Name: check_equality_op(realtime.equality_op, regtype, text, text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    AS $$
/*
Casts *val_1* and *val_2* as type *type_* and check the *op* condition for truthiness
*/
declare
    op_symbol text = (
        case
            when op = 'eq' then '='
            when op = 'neq' then '!='
            when op = 'lt' then '<'
            when op = 'lte' then '<='
            when op = 'gt' then '>'
            when op = 'gte' then '>='
            when op = 'in' then '= any'
            else 'UNKNOWN OP'
        end
    );
    res boolean;
begin
    execute format(
        'select %L::'|| type_::text || ' ' || op_symbol
        || ' ( %L::'
        || (
            case
                when op = 'in' then type_::text || '[]'
                else type_::text end
        )
        || ')', val_1, val_2) into res;
    return res;
end;
$$;


--
-- Name: check_equality_op(realtime.equality_op, regtype, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text, negate boolean) RETURNS boolean
    LANGUAGE plpgsql STABLE
    AS $$
declare
    op_symbol text;
    res boolean;
begin
    -- IS DISTINCT FROM / IS NOT DISTINCT FROM: infix, both sides typed literals
    if op = 'isdistinct' then
        execute format(
            'select %L::%s %s %L::%s',
            val_1,
            type_::text,
            case when negate then 'IS NOT DISTINCT FROM' else 'IS DISTINCT FROM' end,
            val_2,
            type_::text
        ) into res;
        return res;
    end if;

    -- IS requires a keyword RHS (NULL, TRUE, FALSE, UNKNOWN), not a typed literal
    if op = 'is' then
        if val_2 not in ('null', 'true', 'false', 'unknown') then
            raise exception 'invalid value for is filter: must be null, true, false, or unknown';
        end if;
        execute format(
            'select %L::%s %s %s',
            val_1,
            type_::text,
            case when negate then 'IS NOT' else 'IS' end,
            upper(val_2)
        ) into res;
        return res;
    end if;

    op_symbol = case
        when op = 'eq'    then '='
        when op = 'neq'   then '!='
        when op = 'lt'    then '<'
        when op = 'lte'   then '<='
        when op = 'gt'    then '>'
        when op = 'gte'   then '>='
        when op = 'in'    then '= any'
        when op = 'like'   then 'LIKE'
        when op = 'ilike'  then 'ILIKE'
        when op = 'match'  then '~'
        when op = 'imatch' then '~*'
        else null
    end;

    if op_symbol is null then
        raise exception 'unsupported equality operator: %', op::text;
    end if;

    execute format(
        'select %L::%s %s (%L::%s)',
        val_1,
        type_::text,
        op_symbol,
        val_2,
        case when op = 'in' then type_::text || '[]' else type_::text end
    ) into res;

    return case when negate then not res else res end;
end;
$$;


--
-- Name: is_visible_through_filters(realtime.wal_column[], realtime.user_defined_filter[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
    select
        filters is null
        or array_length(filters, 1) is null
        or coalesce(
            count(col.name) = count(1)
            and sum(
                realtime.check_equality_op(
                    op:=f.op,
                    type_:=coalesce(col.type_oid::regtype, col.type_name::regtype),
                    val_1:=col.value #>> '{}',
                    val_2:=f.value,
                    negate:=coalesce(f.negate, false)
                )::int
            ) filter (where col.name is not null) = count(col.name),
            false
        )
    from
        unnest(filters) f
        left join unnest(columns) col
            on f.column_name = col.name;
$$;


--
-- Name: list_changes(name, name, integer, integer); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) RETURNS TABLE(wal jsonb, is_rls_enabled boolean, subscription_ids uuid[], errors text[], slot_changes_count bigint)
    LANGUAGE sql
    SET log_min_messages TO 'fatal'
    AS $$
  WITH pub AS (
    SELECT
      concat_ws(
        ',',
        CASE WHEN bool_or(pubinsert) THEN 'insert' ELSE NULL END,
        CASE WHEN bool_or(pubupdate) THEN 'update' ELSE NULL END,
        CASE WHEN bool_or(pubdelete) THEN 'delete' ELSE NULL END
      ) AS w2j_actions,
      coalesce(
        string_agg(
          realtime.quote_wal2json(format('%I.%I', schemaname, tablename)::regclass),
          ','
        ) filter (WHERE ppt.tablename IS NOT NULL),
        ''
      ) AS w2j_add_tables
    FROM pg_publication pp
    LEFT JOIN pg_publication_tables ppt ON pp.pubname = ppt.pubname
    WHERE pp.pubname = publication
    GROUP BY pp.pubname
    LIMIT 1
  ),
  -- MATERIALIZED ensures pg_logical_slot_get_changes is called exactly once
  w2j AS MATERIALIZED (
    SELECT x.*, pub.w2j_add_tables
    FROM pub,
         pg_logical_slot_get_changes(
           slot_name, null, max_changes,
           'include-pk', 'true',
           'include-transaction', 'false',
           'include-timestamp', 'true',
           'include-type-oids', 'true',
           'format-version', '2',
           'actions', pub.w2j_actions,
           'add-tables', pub.w2j_add_tables
         ) x
  ),
  slot_count AS (
    SELECT count(*)::bigint AS cnt
    FROM w2j
    WHERE w2j.w2j_add_tables <> ''
  ),
  rls_filtered AS (
    SELECT xyz.wal, xyz.is_rls_enabled, xyz.subscription_ids, xyz.errors
    FROM w2j,
         realtime.apply_rls(
           wal := w2j.data::jsonb,
           max_record_bytes := max_record_bytes
         ) xyz(wal, is_rls_enabled, subscription_ids, errors)
    WHERE w2j.w2j_add_tables <> ''
      AND xyz.subscription_ids[1] IS NOT NULL
  )
  SELECT rf.wal, rf.is_rls_enabled, rf.subscription_ids, rf.errors, sc.cnt
  FROM rls_filtered rf, slot_count sc

  UNION ALL

  SELECT null, null, null, null, sc.cnt
  FROM slot_count sc
  WHERE NOT EXISTS (SELECT 1 FROM rls_filtered)
$$;


--
-- Name: list_changes_sync(name, name, integer, integer); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.list_changes_sync(publication name, slot_name name, max_changes integer, max_record_bytes integer) RETURNS TABLE(wal jsonb, is_rls_enabled boolean, subscription_ids uuid[], errors text[], slot_changes_count bigint)
    LANGUAGE sql
    SET log_min_messages TO 'fatal'
    AS $$
  WITH pub AS (
    SELECT
      concat_ws(
        ',',
        CASE WHEN bool_or(pubinsert) THEN 'insert' ELSE NULL END,
        CASE WHEN bool_or(pubupdate) THEN 'update' ELSE NULL END,
        CASE WHEN bool_or(pubdelete) THEN 'delete' ELSE NULL END
      ) AS w2j_actions,
      coalesce(
        string_agg(
          realtime.quote_wal2json(format('%I.%I', schemaname, tablename)::regclass),
          ','
        ) filter (WHERE ppt.tablename IS NOT NULL),
        ''
      ) AS w2j_add_tables
    FROM pg_publication pp
    LEFT JOIN pg_publication_tables ppt ON pp.pubname = ppt.pubname
    WHERE pp.pubname = publication
    GROUP BY pp.pubname
    LIMIT 1
  ),
  -- MATERIALIZED ensures the slot is read exactly once.
  consumed AS MATERIALIZED (
    SELECT x.*, pub.w2j_add_tables
    FROM pub,
         realtime.settled_changes(
           slot_name, max_changes,
           'include-pk', 'true',
           'include-transaction', 'false',
           'include-timestamp', 'true',
           'include-type-oids', 'true',
           'format-version', '2',
           'actions', pub.w2j_actions,
           'add-tables', pub.w2j_add_tables
         ) x
  ),
  slot_count AS (
    SELECT count(*)::bigint AS cnt
    FROM consumed
    WHERE consumed.w2j_add_tables <> ''
  ),
  rls_filtered AS (
    SELECT xyz.wal, xyz.is_rls_enabled, xyz.subscription_ids, xyz.errors
    FROM consumed,
         realtime.apply_rls(
           wal := consumed.data::jsonb,
           max_record_bytes := max_record_bytes
         ) xyz(wal, is_rls_enabled, subscription_ids, errors)
    WHERE consumed.w2j_add_tables <> ''
      AND xyz.subscription_ids[1] IS NOT NULL
  )
  SELECT rf.wal, rf.is_rls_enabled, rf.subscription_ids, rf.errors, sc.cnt
  FROM rls_filtered rf, slot_count sc

  UNION ALL

  SELECT null, null, null, null, sc.cnt
  FROM slot_count sc
  WHERE NOT EXISTS (SELECT 1 FROM rls_filtered)
$$;


--
-- Name: quote_wal2json(regclass); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.quote_wal2json(entity regclass) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
  SELECT
    realtime.wal2json_escape_identifier(nsp.nspname::text)
    || '.'
    || realtime.wal2json_escape_identifier(pc.relname::text)
  FROM pg_class pc
  JOIN pg_namespace nsp ON pc.relnamespace = nsp.oid
  WHERE pc.oid = entity
$$;


--
-- Name: send(jsonb, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  generated_id uuid;
  final_payload jsonb;
BEGIN
  BEGIN
    generated_id := gen_random_uuid();

    -- Check if payload has an 'id' key, if not, add the generated UUID
    IF payload ? 'id' THEN
      final_payload := payload;
    ELSE
      final_payload := jsonb_set(payload, '{id}', to_jsonb(generated_id));
    END IF;

    -- Set the topic configuration
    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    INSERT INTO realtime.messages (id, payload, event, topic, private, extension)
    VALUES (generated_id, final_payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'WarnSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$$;


--
-- Name: send_binary(bytea, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.send_binary(payload bytea, event text, topic text, private boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  generated_id uuid;
BEGIN
  BEGIN
    generated_id := gen_random_uuid();

    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    INSERT INTO realtime.messages (id, binary_payload, event, topic, private, extension)
    VALUES (generated_id, payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'WarnSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$$;


--
-- Name: settled_changes(name, integer, text[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.settled_changes(slot_name name, max_changes integer, VARIADIC opts text[]) RETURNS TABLE(lsn pg_lsn, xid xid, data text)
    LANGUAGE plpgsql
    AS $$
declare
  upto pg_lsn;
  total bigint;
  xids xid[];
  starts bigint[];
  snapshot pg_snapshot;
  running_xids xid[];
  xmax_age int;
  cut bigint;
begin
  -- Each statement in a volatile function takes its own snapshot, which is what lets the
  -- check below see a writer that was still in flight when the peek ran. Under REPEATABLE
  -- READ the snapshot never advances, so a deferred change would never be released.
  if current_setting('transaction_isolation') <> 'read committed' then
    raise exception 'realtime.settled_changes requires READ COMMITTED';
  end if;

  -- The peek and the read below cover the same WAL, so the read cannot reach a commit the
  -- check never saw.
  upto := pg_current_wal_flush_lsn();

  -- One entry per transaction, in commit order: its xid and the position of its first
  -- change. The peek uses the caller's own options, so max_changes counts exactly what the
  -- read counts. A non-transactional logical message is emitted as soon as it is decoded,
  -- tagged with the xid of whatever transaction wrote it, so it does not mark where that
  -- transaction starts.
  select coalesce(sum(g.n), 0),
         array_agg(g.x order by g.first) filter (where g.first is not null),
         array_agg(g.first order by g.first) filter (where g.first is not null)
    into total, xids, starts
    from (
      select p.xid as x, count(*) as n,
             min(p.ord) filter (where not case
               when starts_with(p.data, '{"action":"M"') then (p.data::jsonb->>'transactional')::boolean is false
               else false
             end) as first
      from pg_logical_slot_peek_changes(slot_name, upto, max_changes, variadic opts)
           with ordinality as p(lsn, xid, data, ord)
      group by p.xid
    ) g;

  -- Nothing for the caller, but the slot still has to move past what the peek covered.
  if total = 0 then
    perform pg_replication_slot_advance(slot_name, upto);
    return;
  end if;

  if xids is not null then
    -- Taken after the peek is materialized, so a writer that was still in flight during
    -- decoding is guaranteed to show up here.
    snapshot := pg_current_snapshot();

    -- A commit record reaches the WAL before the writer leaves the proc array, so a change
    -- can be decoded while its row is invisible. apply_rls would resolve a policy against a
    -- row it cannot see and authorize it for nobody, while the read consumed it regardless.
    --
    -- xip lists transactions running when the snapshot was taken. It does not cover a writer
    -- whose xid sits at or beyond xmax, which never appears there, so the horizon is checked
    -- too. age() counts backwards from the current xid and so compares correctly across
    -- wraparound.
    select coalesce(array_agg(running.x::xid), array[]::xid[])
      into running_xids
      from pg_snapshot_xip(snapshot) running(x);
    xmax_age := age(pg_snapshot_xmax(snapshot)::xid);

    select min(u.s) into cut
      from unnest(xids, starts) as u(x, s)
      where u.x = any(running_xids) or age(u.x) <= xmax_age;
  end if;

  -- The read stops right after the commit that brings its count to upto_nchanges, so the
  -- count of changes in front of the first unsettled transaction stops it just before that
  -- transaction.
  if cut is null then
    return query
      select p.* from pg_logical_slot_get_changes(slot_name, upto, max_changes, variadic opts) p;
  elsif cut > 1 then
    return query
      select p.* from pg_logical_slot_get_changes(slot_name, upto, (cut - 1)::int, variadic opts) p;
  end if;
end;
$$;


--
-- Name: subscription_check_filters(); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.subscription_check_filters() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare
    col_names text[] = coalesce(
            array_agg(a.attname order by a.attnum),
            '{}'::text[]
        )
        from
            pg_catalog.pg_attribute a
        where
            a.attrelid = new.entity
            and a.attnum > 0
            and not a.attisdropped
            and pg_catalog.has_column_privilege(
                (new.claims ->> 'role'),
                a.attrelid,
                a.attnum,
                'SELECT'
            );
    filter realtime.user_defined_filter;
    col_type regtype;
    in_val jsonb;
    selected_col text;
begin
    for filter in select * from unnest(new.filters) loop
        if not filter.column_name = any(col_names) then
            raise exception 'invalid column for filter %', filter.column_name;
        end if;

        col_type = (
            select atttypid::regtype
            from pg_catalog.pg_attribute
            where attrelid = new.entity
                  and attname = filter.column_name
        );
        if col_type is null then
            raise exception 'failed to lookup type for column %', filter.column_name;
        end if;

        if filter.op = 'in'::realtime.equality_op then
            in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);
            if coalesce(jsonb_array_length(in_val), 0) > 100 then
                raise exception 'too many values for `in` filter. Maximum 100';
            end if;
        elsif filter.op = 'is'::realtime.equality_op then
            -- `is` requires a keyword RHS rather than a typed literal
            if filter.value not in ('null', 'true', 'false', 'unknown') then
                raise exception 'invalid value for is filter: must be null, true, false, or unknown';
            end if;
            -- IS NULL works for any type, but IS TRUE/FALSE/UNKNOWN require a boolean
            -- operand. Reject the non-null keywords on non-boolean columns here so they
            -- don't abort apply_rls at WAL time.
            if filter.value <> 'null' and col_type <> 'boolean'::regtype then
                raise exception 'is % filter requires a boolean column, got %', filter.value, col_type::text;
            end if;
        elsif filter.op in ('like'::realtime.equality_op, 'ilike'::realtime.equality_op) then
            -- like/ilike apply the text pattern operator (~~); reject column types that
            -- have no such operator instead of failing at WAL time
            if not exists (
                select 1 from pg_catalog.pg_operator
                where oprname = '~~' and oprleft = col_type
            ) then
                raise exception 'operator % requires a text-compatible column type, got %', filter.op::text, col_type::text;
            end if;
        elsif filter.op in ('match'::realtime.equality_op, 'imatch'::realtime.equality_op) then
            -- match/imatch apply the regex operators ~ / ~*; reject column types that have
            -- no such operator (e.g. integer) instead of failing at WAL time, mirroring the
            -- like/ilike guard above.
            if not exists (
                select 1 from pg_catalog.pg_operator
                where oprname = case when filter.op = 'imatch'::realtime.equality_op then '~*' else '~' end
                  and oprleft = col_type
                  and oprright = col_type
                  and oprresult = 'boolean'::regtype
            ) then
                raise exception 'operator % requires a text-compatible column type, got %', filter.op::text, col_type::text;
            end if;
            -- validate the regex eagerly so a bad pattern is rejected here, not inside
            -- apply_rls where it would abort the WAL stream for the entity
            begin
                perform '' ~ filter.value;
            exception when others then
                raise exception 'invalid regular expression for % filter: %', filter.op::text, sqlerrm;
            end;
        else
            -- eq/neq/lt/lte/gt/gte: value must be coercable to the type
            perform realtime.cast(filter.value, col_type);
        end if;
    end loop;

    if new.selected_columns is not null then
        for selected_col in select * from unnest(new.selected_columns) loop
            if not selected_col = any(col_names) then
                raise exception 'invalid column for select %', selected_col;
            end if;
        end loop;
    end if;

    -- Apply consistent order to filters so the unique constraint can't be tricked by a
    -- different filter order. negate is part of the sort key.
    new.filters = coalesce(
        array_agg(f order by f.column_name, f.op, f.value, f.negate),
        '{}'
    ) from unnest(new.filters) f;

    -- Normalize selected_columns order so ARRAY['a','b'] and ARRAY['b','a'] are treated
    -- as the same subscription group in apply_rls. Preserve an empty array as '{}'
    -- ("primary keys only") so it stays distinct from NULL ("all columns"); array_agg
    -- over an empty set would otherwise collapse '{}' back to NULL.
    if new.selected_columns is not null then
        new.selected_columns = coalesce(
            (
                select array_agg(c order by c)
                from unnest(new.selected_columns) c
            ),
            '{}'::text[]
        );
    end if;

    return new;
end;
$$;


--
-- Name: to_regrole(text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.to_regrole(role_name text) RETURNS regrole
    LANGUAGE sql IMMUTABLE
    AS $$ select role_name::regrole $$;


--
-- Name: topic(); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.topic() RETURNS text
    LANGUAGE sql STABLE
    AS $$
select nullif(current_setting('realtime.topic', true), '')::text;
$$;


--
-- Name: wal2json_escape_identifier(text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.wal2json_escape_identifier(name text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
  -- Prefix `\`, `,`, `.`, and any whitespace with `\`
  SELECT regexp_replace(name, '([\\,.[:space:]])', '\\\1', 'g')
$$;


--
-- Name: allow_any_operation(text[]); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.allow_any_operation(expected_operations text[]) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT CASE
      WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
      ELSE raw_operation
    END AS current_operation
    FROM current_operation
  )
  SELECT EXISTS (
    SELECT 1
    FROM normalized n
    CROSS JOIN LATERAL unnest(expected_operations) AS expected_operation
    WHERE expected_operation IS NOT NULL
      AND expected_operation <> ''
      AND n.current_operation = CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END
  );
$$;


--
-- Name: allow_only_operation(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.allow_only_operation(expected_operation text) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT
      CASE
        WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
        ELSE raw_operation
      END AS current_operation,
      CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END AS requested_operation
    FROM current_operation
  )
  SELECT CASE
    WHEN requested_operation IS NULL OR requested_operation = '' THEN FALSE
    ELSE COALESCE(current_operation = requested_operation, FALSE)
  END
  FROM normalized;
$$;


--
-- Name: can_insert_object(text, text, uuid, jsonb); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


--
-- Name: enforce_bucket_lifecycle_service_role(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.enforce_bucket_lifecycle_service_role() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog'
    AS $$
BEGIN
  IF current_user::text IS DISTINCT FROM TG_ARGV[0]
     AND (
       OLD.lifecycle_configuration IS DISTINCT FROM NEW.lifecycle_configuration
       OR OLD.lifecycle_configuration_generation IS DISTINCT FROM NEW.lifecycle_configuration_generation
     ) THEN
    -- AFTER runs only after caller RLS has accepted the proposed row. The API
    -- recognizes this specific error after rolling back its permission probe;
    -- direct non-service writes still fail and cannot persist the change.
    RAISE EXCEPTION 'bucket control columns may only be changed by the configured storage service role'
      USING ERRCODE = 'PST01',
            SCHEMA = TG_TABLE_SCHEMA,
            TABLE = TG_TABLE_NAME,
            CONSTRAINT = TG_NAME;
  END IF;

  RETURN NULL;
END;
$$;


--
-- Name: enforce_bucket_name_length(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.enforce_bucket_name_length() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


--
-- Name: extension(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.extension(name text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Get the last path segment (the actual filename)
    SELECT _parts[array_length(_parts, 1)] INTO _filename;
    -- Extract extension: reverse, split on '.', then reverse again
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$$;


--
-- Name: filename(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.filename(name text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    SELECT string_to_array(name, '/') INTO _parts;
    RETURN _parts[array_length(_parts, 1)];
END
$$;


--
-- Name: foldername(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.foldername(name text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$$;


--
-- Name: get_common_prefix(text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_common_prefix(p_key text, p_prefix text, p_delimiter text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
SELECT CASE
    WHEN p_delimiter <> ''
         AND position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)) > 0
    THEN left(
        p_key,
        length(p_prefix)
            + position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1))
            + length(p_delimiter) - 1
    )
    ELSE NULL
END;
$$;


--
-- Name: get_size_by_bucket(text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_size_by_bucket(noncurrent_versions text DEFAULT 'include'::text, delete_markers text DEFAULT 'include'::text) RETURNS TABLE(size bigint, bucket_id text)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    -- COALESCE first: NULL NOT IN (...) evaluates to NULL (not TRUE), so a
    -- bare NOT IN check silently leaves an explicit NULL argument unreset.
    noncurrent_versions := COALESCE(noncurrent_versions, 'include');
    delete_markers := COALESCE(delete_markers, 'include');
    IF noncurrent_versions NOT IN ('exclude', 'only', 'include') THEN
        noncurrent_versions := 'include';
    END IF;
    IF delete_markers NOT IN ('exclude', 'only', 'include') THEN
        delete_markers := 'include';
    END IF;

    return query
        select sum((metadata->>'size')::bigint)::bigint as size, obj.bucket_id
        from "storage".objects as obj
        where (noncurrent_versions != 'exclude' OR obj.archived_at IS NULL)
          and (noncurrent_versions != 'only' OR obj.archived_at IS NOT NULL)
          and (delete_markers != 'exclude' OR NOT obj.is_delete_marker)
          and (delete_markers != 'only' OR obj.is_delete_marker)
        group by obj.bucket_id;
END
$$;


--
-- Name: list_multipart_uploads_with_delimiter(text, text, text, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text, raw_prefix_param text DEFAULT NULL::text) RETURNS TABLE(key text, id text, created_at timestamp with time zone)
    LANGUAGE sql STABLE
    AS $_$
WITH candidates AS (
    SELECT
        upload.key AS object_key,
        CASE
            WHEN position($3 IN substring(upload.key FROM length(coalesce($7, $2)) + 1)) > 0
            THEN left(
                upload.key,
                length(coalesce($7, $2))
                    + position($3 IN substring(upload.key FROM length(coalesce($7, $2)) + 1))
                    + length($3) - 1
            )
            ELSE upload.key
        END AS result_key,
        upload.id,
        upload.created_at,
        position($3 IN substring(upload.key FROM length(coalesce($7, $2)) + 1)) > 0 AS is_common_prefix
    FROM storage.s3_multipart_uploads AS upload
    WHERE upload.bucket_id = $1
      AND upload.key COLLATE "C" LIKE $2 || '%'
), filtered AS (
    SELECT candidate.*
    FROM candidates AS candidate
    WHERE $5 = ''
       OR candidate.result_key COLLATE "C" > $5
       OR (
           candidate.result_key COLLATE "C" = $5
           AND NOT candidate.is_common_prefix
           AND $6 <> ''
           -- A completed or aborted marker repeats the remaining same-key uploads.
           AND COALESCE(
               (candidate.created_at, candidate.id COLLATE "C") > (
                   SELECT marker.created_at, marker.id COLLATE "C"
                   FROM storage.s3_multipart_uploads AS marker
                   WHERE marker.bucket_id = $1
                     AND marker.key COLLATE "C" = $5
                     AND marker.id = $6
               ),
               TRUE
           )
       )
), ranked AS (
    SELECT
        filtered.*,
        row_number() OVER (
            PARTITION BY filtered.result_key COLLATE "C"
            ORDER BY filtered.created_at, filtered.id COLLATE "C"
        ) AS prefix_rank
    FROM filtered
)
SELECT ranked.result_key, ranked.id, ranked.created_at
FROM ranked
WHERE NOT ranked.is_common_prefix OR ranked.prefix_rank = 1
ORDER BY ranked.result_key COLLATE "C", ranked.created_at, ranked.id COLLATE "C"
LIMIT $4;
$_$;


--
-- Name: list_objects_with_delimiter(text, text, text, integer, text, text, text, text, text, timestamp with time zone, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text, noncurrent_versions text DEFAULT 'exclude'::text, delete_markers text DEFAULT 'exclude'::text, next_token_archived_at timestamp with time zone DEFAULT NULL::timestamp with time zone, next_token_version text DEFAULT ''::text) RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, version text, archived_at timestamp with time zone, is_delete_marker boolean, is_versioned boolean)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;

    -- Configuration
    v_is_asc BOOLEAN;
    v_prefix TEXT;
    v_start TEXT;
    v_start_relative TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;
    v_version_filter TEXT;

    -- true when noncurrent_versions can return >1 row per name; keeps them
    -- ordered most-recent-first and lets pagination resume mid-key
    v_multi_row BOOLEAN;
    v_name_order TEXT;
    v_exact_range_predicate TEXT;
    v_strict_range_predicate TEXT;
    v_inclusive_range_predicate TEXT;

    -- Seek state for the current name. archived_at is normalized to JavaScript's
    -- millisecond precision and version breaks ties within the same millisecond.
    -- Current rows use 'infinity'; NULL means no tiebreak has been established.
    v_next_seek TEXT;
    v_next_seek_at TIMESTAMPTZ;
    v_next_seek_version TEXT;
    v_next_seek_strict BOOLEAN := false;
    v_cursor_is_folder BOOLEAN;
    v_count INT := 0;
    v_previous_seek TEXT;
    v_previous_seek_at TIMESTAMPTZ;
    v_previous_seek_version TEXT;
    v_previous_count INT;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;
    v_batch_query_strict TEXT;
    v_delete_marker_peek_query TEXT;
    v_delete_marker_peek_query_strict TEXT;

BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_is_asc := lower(coalesce(sort_order, 'asc')) = 'asc';
    v_prefix := coalesce(prefix_param, '');
    v_start := CASE WHEN coalesce(next_token, '') <> '' THEN next_token ELSE coalesce(start_after, '') END;
    v_file_batch_size := LEAST(GREATEST(max_keys * 2, 100), 1000);
    v_next_seek_at := NULL;
    v_next_seek_version := '';

    -- COALESCE first: NULL NOT IN (...) evaluates to NULL (not TRUE), so a
    -- bare NOT IN check silently leaves an explicit NULL argument unreset.
    noncurrent_versions := COALESCE(noncurrent_versions, 'exclude');
    delete_markers := COALESCE(delete_markers, 'exclude');
    IF noncurrent_versions NOT IN ('exclude', 'only', 'include') THEN
        noncurrent_versions := 'exclude';
    END IF;
    IF delete_markers NOT IN ('exclude', 'only', 'include') THEN
        delete_markers := 'exclude';
    END IF;

    v_multi_row := noncurrent_versions IN ('only', 'include');
    v_name_order := CASE WHEN v_is_asc THEN 'ASC' ELSE 'DESC' END;

    v_version_filter := '';
    IF noncurrent_versions = 'exclude' THEN
        v_version_filter := v_version_filter || ' AND o.archived_at IS NULL';
    ELSIF noncurrent_versions = 'only' THEN
        v_version_filter := v_version_filter || ' AND o.archived_at IS NOT NULL';
    END IF;
    IF delete_markers = 'exclude' THEN
        v_version_filter := v_version_filter || ' AND NOT o.is_delete_marker';
    ELSIF delete_markers = 'only' THEN
        v_version_filter := v_version_filter || ' AND o.is_delete_marker';
    END IF;

    -- Calculate upper bound for prefix filtering (bytewise, using COLLATE "C")
    IF v_prefix = '' THEN
        v_upper_bound := NULL;
    ELSE
        v_upper_bound := left(v_prefix, -1) || chr(ascii(right(v_prefix, 1)) + 1);
    END IF;

    -- Keep caller-provided cursors inside the requested prefix range.
    IF v_start <> '' AND v_upper_bound IS NOT NULL THEN
        IF v_is_asc THEN
            IF v_start COLLATE "C" < v_prefix COLLATE "C" THEN
                v_start := '';
            ELSIF v_start COLLATE "C" >= v_upper_bound COLLATE "C" THEN
                RETURN;
            END IF;
        ELSE
            IF v_start COLLATE "C" < v_prefix COLLATE "C" THEN
                RETURN;
            ELSIF v_start COLLATE "C" >= v_upper_bound COLLATE "C" THEN
                v_start := '';
            END IF;
        END IF;
    END IF;

    v_start_relative := substring(v_start FROM length(v_prefix) + 1);

    -- Direction affects only the indexed name range and its ordering. Cursor
    -- state transitions and within-key version ordering stay shared.
    IF v_is_asc THEN
        v_exact_range_predicate := 'TRUE';
        v_strict_range_predicate := 'o.name COLLATE "C" > $2';
        v_inclusive_range_predicate := 'o.name COLLATE "C" >= $2';
        IF v_upper_bound IS NOT NULL THEN
            v_exact_range_predicate := 'o.name COLLATE "C" < $3';
            v_strict_range_predicate := v_strict_range_predicate || ' AND o.name COLLATE "C" < $3';
            v_inclusive_range_predicate := v_inclusive_range_predicate || ' AND o.name COLLATE "C" < $3';
        END IF;
    ELSE
        v_exact_range_predicate := 'TRUE';
        v_strict_range_predicate := 'o.name COLLATE "C" < $2';
        v_inclusive_range_predicate := 'o.name COLLATE "C" < $2';
        IF v_prefix <> '' THEN
            v_exact_range_predicate := 'o.name COLLATE "C" >= $3';
            v_strict_range_predicate := v_strict_range_predicate || ' AND o.name COLLATE "C" >= $3';
            v_inclusive_range_predicate := v_inclusive_range_predicate || ' AND o.name COLLATE "C" >= $3';
        END IF;
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    -- The multi-row order matches the externally serialized cursor exactly:
    -- archived_at at millisecond precision, then version as the final tiebreak.
    --
    -- When v_multi_row, the seek is a keyset tuple comparison ("name > $2 OR
    -- (name = $2 AND tiebreak)") - Postgres won't split that OR into indexable
    -- form (confirmed even with fully literal values), so as one WHERE clause
    -- it forces a full bucket scan filtered row-by-row. Splitting it into two
    -- independently-indexable branches (exact name match with the tiebreak
    -- filter, vs. strictly-past names) combined with UNION ALL lets each
    -- branch keep name as a real index condition; the outer ORDER BY/LIMIT
    -- re-merges them into the same page the single query used to produce.
    IF v_multi_row THEN
        v_batch_query := format(
            $sql$
            SELECT *
            FROM (
                (
                    SELECT o.name, o.id, o.updated_at, o.created_at,
                           o.last_accessed_at, o.metadata, o.version,
                           o.archived_at, o.is_delete_marker, o.is_versioned
                    FROM storage.objects o
                    WHERE o.bucket_id = $1
                      AND o.name COLLATE "C" = $2
                      AND %s
                      AND NOT $7::boolean
                      AND (
                          $5::timestamptz IS NULL
                          OR COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) < $5
                          OR (
                              COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) = $5
                              AND COALESCE(o.version, '') > $6
                          )
                      )
                      %s
                    ORDER BY
                        COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) DESC,
                        COALESCE(o.version, '') ASC
                    LIMIT $4
                )
                UNION ALL
                (
                    SELECT o.name, o.id, o.updated_at, o.created_at,
                           o.last_accessed_at, o.metadata, o.version,
                           o.archived_at, o.is_delete_marker, o.is_versioned
                    FROM storage.objects o
                    WHERE o.bucket_id = $1
                      AND %s
                      %s
                    ORDER BY
                        o.name COLLATE "C" %s,
                        COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) DESC,
                        COALESCE(o.version, '') ASC
                    LIMIT $4
                )
            ) sub
            ORDER BY
                sub.name COLLATE "C" %s,
                COALESCE(date_trunc('milliseconds', sub.archived_at), 'infinity'::timestamptz) DESC,
                COALESCE(sub.version, '') ASC
            LIMIT $4
            $sql$,
            v_exact_range_predicate,
            v_version_filter,
            v_strict_range_predicate,
            v_version_filter,
            v_name_order,
            v_name_order
        );
    ELSE
        v_batch_query := format(
            $sql$
            SELECT o.name, o.id, o.updated_at, o.created_at,
                   o.last_accessed_at, o.metadata, o.version,
                   o.archived_at, o.is_delete_marker, o.is_versioned
            FROM storage.objects o
            WHERE o.bucket_id = $1
              AND %s
              %s
            ORDER BY o.name COLLATE "C" %s, o.archived_at DESC
            LIMIT $4
            $sql$,
            v_inclusive_range_predicate,
            v_version_filter,
            v_name_order
        );

        -- Strict counterpart of the query above: used once the single-row
        -- ASC batch advance (below) has left v_next_seek pointing at the
        -- last row already emitted, so an inclusive predicate would
        -- re-match it forever. Only single-row mode ever sets strict mode,
        -- so this variant is never needed when v_multi_row.
        v_batch_query_strict := format(
            $sql$
            SELECT o.name, o.id, o.updated_at, o.created_at,
                   o.last_accessed_at, o.metadata, o.version,
                   o.archived_at, o.is_delete_marker, o.is_versioned
            FROM storage.objects o
            WHERE o.bucket_id = $1
              AND %s
              %s
            ORDER BY o.name COLLATE "C" %s, o.archived_at DESC
            LIMIT $4
            $sql$,
            v_strict_range_predicate,
            v_version_filter,
            v_name_order
        );
    END IF;

    -- The static peek predicates cannot use the partial delete-marker index
    -- once PL/pgSQL switches to a generic plan because whether
    -- is_delete_marker is required remains parameter-dependent. Reuse the
    -- already-specialized batch query with a one-row limit for this sparse
    -- filter so the plan sees a literal `o.is_delete_marker` predicate.
    IF delete_markers = 'only' THEN
        v_delete_marker_peek_query :=
            'SELECT marker_page.name FROM (' || v_batch_query || ') marker_page LIMIT 1';
        IF NOT v_multi_row THEN
            v_delete_marker_peek_query_strict :=
                'SELECT marker_page.name FROM (' || v_batch_query_strict || ') marker_page LIMIT 1';
        END IF;
    END IF;

    -- ========================================================================
    -- SEEK INITIALIZATION: Determine starting position
    -- ========================================================================
    IF v_start = '' THEN
        IF v_is_asc THEN
            v_next_seek := v_prefix;
        ELSE
            -- DESC without cursor performs one specialized initial seek so
            -- partial current-version and delete-marker indexes remain available.
            EXECUTE format(
                'SELECT o.name FROM storage.objects o WHERE o.bucket_id = $1%s%s ORDER BY o.name COLLATE "C" DESC LIMIT 1',
                CASE WHEN v_upper_bound IS NOT NULL
                    THEN ' AND o.name COLLATE "C" >= $2 AND o.name COLLATE "C" < $3'
                    ELSE ''
                END,
                v_version_filter
            )
            INTO v_next_seek
            USING _bucket_id, v_prefix, v_upper_bound;

            IF v_next_seek IS NOT NULL THEN
                v_next_seek := v_next_seek || delimiter_param;
            ELSE
                RETURN;
            END IF;
        END IF;
    ELSE
        -- Folder continuation tokens retain their trailing delimiter. A
        -- delimiter-less startAfter is always a literal key boundary.
        v_cursor_is_folder := delimiter_param <> ''
            AND v_start_relative <> ''
            AND right(v_start_relative, length(delimiter_param)) = delimiter_param;

        IF v_cursor_is_folder THEN
            v_next_seek := CASE
                WHEN right(v_start, length(delimiter_param)) = delimiter_param
                    THEN v_start
                ELSE v_start || delimiter_param
            END;
            IF v_is_asc THEN
                v_next_seek := left(v_next_seek, -1)
                    || chr(ascii(right(v_next_seek, 1)) + 1);
            END IF;
            v_next_seek_strict := NOT v_is_asc;
        ELSE
            -- leaf object: when v_multi_row, stay on v_start with the
            -- caller-supplied tiebreak so a page boundary mid-key resumes
            -- that key's remaining rows instead of skipping them. Truncate
            -- to milliseconds like every other v_next_seek_at assignment -
            -- harmless today since object.ts's cursor always round-trips
            -- through JS Date first, but this shouldn't rely on that.
            IF v_multi_row THEN
                v_next_seek := v_start;
                v_next_seek_at := date_trunc('milliseconds', next_token_archived_at);
                v_next_seek_version := coalesce(next_token_version, '');
                v_next_seek_strict := coalesce(next_token, '') = '';
            ELSIF v_is_asc THEN
                v_next_seek := v_start;
                v_next_seek_strict := true;
            ELSE
                v_next_seek := v_start;
            END IF;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= max_keys;

        v_previous_seek := v_next_seek;
        v_previous_seek_at := v_next_seek_at;
        v_previous_seek_version := v_next_seek_version;
        v_previous_count := v_count;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        -- v_multi_row is branched here (rather than folded into the WHERE
        -- clause as a bound parameter) so each concrete query keeps an
        -- unconditional seek predicate - once PL/pgSQL switches to its
        -- cached generic plan (after 5 calls), a parameter-gated
        -- "(NOT v_multi_row AND name >= $x) OR (v_multi_row AND ...)"
        -- predicate stops the planner from using name as an index
        -- condition at all, degrading every subsequent peek to a full
        -- index scan filtered row-by-row instead of a bounded range scan.
        -- v_multi_row's seek predicate is a keyset tuple comparison
        -- ("name > x OR (name = x AND tiebreak)") - Postgres does not
        -- split this OR into indexable form even with fully literal
        -- values, so it falls back to a full scan filtered row-by-row.
        -- Splitting it into two independently-indexable branches (exact
        -- name match with the tiebreak filter, vs. strictly-past name)
        -- combined with UNION ALL lets each branch keep name as a real
        -- index condition; the outer ORDER BY/LIMIT picks whichever of
        -- the (at most 2) rows sorts first.
        IF delete_markers = 'only' THEN
            EXECUTE CASE WHEN v_next_seek_strict AND NOT v_multi_row
                THEN v_delete_marker_peek_query_strict
                ELSE v_delete_marker_peek_query
            END
                INTO v_peek_name
                USING _bucket_id, v_next_seek,
                    CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix) ELSE v_prefix END,
                    1, v_next_seek_at, v_next_seek_version, v_next_seek_strict;
        ELSIF v_multi_row THEN
            IF v_is_asc THEN
                IF v_upper_bound IS NOT NULL THEN
                    SELECT sub.name INTO v_peek_name FROM (
                        (SELECT o.name FROM storage.objects o
                         WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" = v_next_seek
                           AND o.name COLLATE "C" < v_upper_bound
                           AND NOT v_next_seek_strict
                           AND (v_next_seek_at IS NULL
                                OR COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) < v_next_seek_at
                                OR (COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) = v_next_seek_at
                                    AND COALESCE(o.version, '') > v_next_seek_version))
                           AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                           AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                           AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                           AND (delete_markers != 'only' OR o.is_delete_marker)
                         ORDER BY COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) DESC, COALESCE(o.version, '') ASC LIMIT 1)
                        UNION ALL
                        (SELECT o.name FROM storage.objects o
                         WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" > v_next_seek AND o.name COLLATE "C" < v_upper_bound
                           AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                           AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                           AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                           AND (delete_markers != 'only' OR o.is_delete_marker)
                         ORDER BY o.name COLLATE "C" ASC LIMIT 1)
                    ) sub ORDER BY sub.name COLLATE "C" ASC LIMIT 1;
                ELSE
                    SELECT sub.name INTO v_peek_name FROM (
                        (SELECT o.name FROM storage.objects o
                         WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" = v_next_seek
                           AND NOT v_next_seek_strict
                           AND (v_next_seek_at IS NULL
                                OR COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) < v_next_seek_at
                                OR (COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) = v_next_seek_at
                                    AND COALESCE(o.version, '') > v_next_seek_version))
                           AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                           AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                           AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                           AND (delete_markers != 'only' OR o.is_delete_marker)
                         ORDER BY COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) DESC, COALESCE(o.version, '') ASC LIMIT 1)
                        UNION ALL
                        (SELECT o.name FROM storage.objects o
                         WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" > v_next_seek
                           AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                           AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                           AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                           AND (delete_markers != 'only' OR o.is_delete_marker)
                         ORDER BY o.name COLLATE "C" ASC LIMIT 1)
                    ) sub ORDER BY sub.name COLLATE "C" ASC LIMIT 1;
                END IF;
            ELSE
                IF v_upper_bound IS NOT NULL THEN
                    SELECT sub.name INTO v_peek_name FROM (
                        (SELECT o.name FROM storage.objects o
                         WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" = v_next_seek
                           AND o.name COLLATE "C" >= v_prefix
                           AND NOT v_next_seek_strict
                           AND (v_next_seek_at IS NULL
                                OR COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) < v_next_seek_at
                                OR (COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) = v_next_seek_at
                                    AND COALESCE(o.version, '') > v_next_seek_version))
                           AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                           AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                           AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                           AND (delete_markers != 'only' OR o.is_delete_marker)
                         ORDER BY COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) DESC, COALESCE(o.version, '') ASC LIMIT 1)
                        UNION ALL
                        (SELECT o.name FROM storage.objects o
                         WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                           AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                           AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                           AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                           AND (delete_markers != 'only' OR o.is_delete_marker)
                         ORDER BY o.name COLLATE "C" DESC LIMIT 1)
                    ) sub ORDER BY sub.name COLLATE "C" DESC LIMIT 1;
                ELSE
                    SELECT sub.name INTO v_peek_name FROM (
                        (SELECT o.name FROM storage.objects o
                         WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" = v_next_seek
                           AND NOT v_next_seek_strict
                           AND (v_next_seek_at IS NULL
                                OR COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) < v_next_seek_at
                                OR (COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) = v_next_seek_at
                                    AND COALESCE(o.version, '') > v_next_seek_version))
                           AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                           AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                           AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                           AND (delete_markers != 'only' OR o.is_delete_marker)
                         ORDER BY COALESCE(date_trunc('milliseconds', o.archived_at), 'infinity'::timestamptz) DESC, COALESCE(o.version, '') ASC LIMIT 1)
                        UNION ALL
                        (SELECT o.name FROM storage.objects o
                         WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek
                           AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                           AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                           AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                           AND (delete_markers != 'only' OR o.is_delete_marker)
                         ORDER BY o.name COLLATE "C" DESC LIMIT 1)
                    ) sub ORDER BY sub.name COLLATE "C" DESC LIMIT 1;
                END IF;
            END IF;
        ELSE
            -- Single-row mode is always noncurrent_versions='exclude'. Keep
            -- this predicate literal so generic plans use the current index.
            IF v_is_asc THEN
                IF v_next_seek_strict AND v_upper_bound IS NOT NULL THEN
                    SELECT o.name INTO v_peek_name FROM storage.objects o
                    WHERE o.bucket_id = _bucket_id
                      AND o.name COLLATE "C" > v_next_seek
                      AND o.name COLLATE "C" < v_upper_bound
                      AND o.archived_at IS NULL
                      AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                      AND (delete_markers != 'only' OR o.is_delete_marker)
                    ORDER BY o.name COLLATE "C" ASC LIMIT 1;
                ELSIF v_next_seek_strict THEN
                    SELECT o.name INTO v_peek_name FROM storage.objects o
                    WHERE o.bucket_id = _bucket_id
                      AND o.name COLLATE "C" > v_next_seek
                      AND o.archived_at IS NULL
                      AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                      AND (delete_markers != 'only' OR o.is_delete_marker)
                    ORDER BY o.name COLLATE "C" ASC LIMIT 1;
                ELSIF v_upper_bound IS NOT NULL THEN
                    SELECT o.name INTO v_peek_name FROM storage.objects o
                    WHERE o.bucket_id = _bucket_id
                      AND o.name COLLATE "C" >= v_next_seek
                      AND o.name COLLATE "C" < v_upper_bound
                      AND o.archived_at IS NULL
                      AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                      AND (delete_markers != 'only' OR o.is_delete_marker)
                    ORDER BY o.name COLLATE "C" ASC LIMIT 1;
                ELSE
                    SELECT o.name INTO v_peek_name FROM storage.objects o
                    WHERE o.bucket_id = _bucket_id
                      AND o.name COLLATE "C" >= v_next_seek
                      AND o.archived_at IS NULL
                      AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                      AND (delete_markers != 'only' OR o.is_delete_marker)
                    ORDER BY o.name COLLATE "C" ASC LIMIT 1;
                END IF;
            ELSE
                IF v_upper_bound IS NOT NULL THEN
                    SELECT o.name INTO v_peek_name FROM storage.objects o
                    WHERE o.bucket_id = _bucket_id
                      AND o.name COLLATE "C" < v_next_seek
                      AND o.name COLLATE "C" >= v_prefix
                      AND o.archived_at IS NULL
                      AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                      AND (delete_markers != 'only' OR o.is_delete_marker)
                    ORDER BY o.name COLLATE "C" DESC LIMIT 1;
                ELSE
                    SELECT o.name INTO v_peek_name FROM storage.objects o
                    WHERE o.bucket_id = _bucket_id
                      AND o.name COLLATE "C" < v_next_seek
                      AND o.archived_at IS NULL
                      AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                      AND (delete_markers != 'only' OR o.is_delete_marker)
                    ORDER BY o.name COLLATE "C" DESC LIMIT 1;
                END IF;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(v_peek_name, v_prefix, delimiter_param);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Emit and skip to next folder (no heap access needed)
            name := v_common_prefix;
            id := NULL;
            updated_at := NULL;
            created_at := NULL;
            last_accessed_at := NULL;
            metadata := NULL;
            version := NULL;
            archived_at := NULL;
            is_delete_marker := NULL;
            is_versioned := NULL;
            RETURN NEXT;
            v_count := v_count + 1;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := left(v_common_prefix, -1)
                    || chr(ascii(right(v_common_prefix, 1)) + 1);
            ELSE
                v_next_seek := v_common_prefix;
            END IF;
            v_next_seek_at := NULL;
            v_next_seek_version := '';
            v_next_seek_strict := NOT v_is_asc;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE CASE WHEN v_next_seek_strict AND NOT v_multi_row THEN v_batch_query_strict ELSE v_batch_query END
                USING _bucket_id, v_next_seek,
                CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix) ELSE v_prefix END, v_file_batch_size, v_next_seek_at, v_next_seek_version,
                v_next_seek_strict
            LOOP
                v_common_prefix := storage.get_common_prefix(v_current.name, v_prefix, delimiter_param);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it. Reset
                    -- strict mode too it may have been set by an earlier
                    -- row in this same batch (see the single-row ASC advance
                    -- below), and v_next_seek here is the folder-triggering
                    -- row's own name, which the next peek must find inclusively.
                    v_next_seek := CASE
                        WHEN v_is_asc THEN v_current.name
                        ELSE v_current.name || delimiter_param
                    END;
                    v_next_seek_at := NULL;
                    v_next_seek_version := '';
                    v_next_seek_strict := false;
                    EXIT;
                END IF;

                -- Emit file
                name := v_current.name;
                id := v_current.id;
                updated_at := v_current.updated_at;
                created_at := v_current.created_at;
                last_accessed_at := v_current.last_accessed_at;
                metadata := v_current.metadata;
                version := v_current.version;
                archived_at := v_current.archived_at;
                is_delete_marker := v_current.is_delete_marker;
                is_versioned := v_current.is_versioned;
                RETURN NEXT;
                v_count := v_count + 1;

                -- when v_multi_row, stay on this name and record its
                -- archived_at as the new tiebreak so remaining rows for the
                -- same key are picked up before moving to the next name
                IF v_multi_row THEN
                    v_next_seek := v_current.name;
                    v_next_seek_at := COALESCE(date_trunc('milliseconds', v_current.archived_at), 'infinity'::timestamptz);
                    v_next_seek_version := COALESCE(v_current.version, '');
                    v_next_seek_strict := false;
                ELSIF v_is_asc THEN
                    -- Appending the delimiter as a fake lexical successor
                    -- would skip a real key like `name || '!'` (or any
                    -- character sorting below the delimiter), which sorts
                    -- between `name` and `name || delimiter`. Track the real
                    -- name and mark the next comparison strict instead.
                    v_next_seek := v_current.name;
                    v_next_seek_strict := true;
                ELSE
                    v_next_seek := v_current.name;
                END IF;

                EXIT WHEN v_count >= max_keys;
            END LOOP;
        END IF;

        IF v_count = v_previous_count
           AND v_next_seek IS NOT DISTINCT FROM v_previous_seek
           AND v_next_seek_at IS NOT DISTINCT FROM v_previous_seek_at
           AND v_next_seek_version IS NOT DISTINCT FROM v_previous_seek_version THEN
            RAISE EXCEPTION 'storage.list_objects_with_delimiter made no progress at seek (%, %, %)',
                v_next_seek, v_next_seek_at, v_next_seek_version;
        END IF;
    END LOOP;
END;
$_$;


--
-- Name: operation(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.operation() RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


--
-- Name: protect_bucket_control_columns(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.protect_bucket_control_columns() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE
  configuration_changed boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.lifecycle_configuration IS NOT NULL
       OR NEW.lifecycle_configuration_generation IS NOT NULL THEN
      IF NOT pg_has_role(current_user, TG_ARGV[0], 'MEMBER') THEN
        RAISE EXCEPTION 'only members of the configured storage service role may insert lifecycle policy state'
          USING ERRCODE = '42501',
                HINT = format(
                  'Insert with both lifecycle columns NULL and configure lifecycle through the Storage API afterward, or insert as a member of %I.',
                  TG_ARGV[0]
                );
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  configuration_changed =
    OLD.lifecycle_configuration IS DISTINCT FROM NEW.lifecycle_configuration
    OR OLD.lifecycle_configuration_generation IS DISTINCT FROM NEW.lifecycle_configuration_generation;

  IF NOT configuration_changed THEN
    RETURN NEW;
  END IF;

  IF NEW.type IS DISTINCT FROM 'STANDARD' THEN
    RAISE EXCEPTION 'bucket versioning and lifecycle controls require a Standard bucket'
      USING ERRCODE = '0A000';
  END IF;

  IF NEW.lifecycle_configuration IS NULL
     AND NEW.lifecycle_configuration_generation IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.lifecycle_configuration IS NULL
     OR NEW.lifecycle_configuration_generation IS NULL
     OR OLD.lifecycle_configuration IS NOT DISTINCT FROM NEW.lifecycle_configuration
     OR OLD.lifecycle_configuration_generation IS NOT DISTINCT FROM NEW.lifecycle_configuration_generation THEN
    RAISE EXCEPTION 'a changed lifecycle policy requires a new non-null generation'
      USING ERRCODE = '22023';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: protect_delete(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.protect_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Check if storage.allow_delete_query is set to 'true'
    IF COALESCE(current_setting('storage.allow_delete_query', true), 'false') != 'true' THEN
        RAISE EXCEPTION 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'
            USING HINT = 'This prevents accidental data loss from orphaned objects.',
                  ERRCODE = '42501';
    END IF;
    RETURN NULL;
END;
$$;


--
-- Name: search(text, text, integer, integer, integer, text, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text, noncurrent_versions text DEFAULT 'exclude'::text, delete_markers text DEFAULT 'exclude'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb, version text, archived_at timestamp with time zone, is_delete_marker boolean, is_versioned boolean)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;
    v_delimiter CONSTANT TEXT := '/';

    -- Configuration
    v_limit INT;
    v_prefix TEXT;
    v_prefix_lower TEXT;
    v_prefix_len INT;
    v_prefix_start INT;
    v_combined_levels INT;
    v_is_asc BOOLEAN;
    v_order_by TEXT;
    v_sort_order TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;
    v_version_filter TEXT;
    v_multi_row BOOLEAN;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;
    v_delete_marker_peek_query TEXT;
    v_delete_marker_peek_query_strict TEXT;

    -- Seek state
    v_next_seek TEXT;
    v_next_seek_at TIMESTAMPTZ;
    v_next_seek_version TEXT;
    v_next_seek_strict BOOLEAN := false;
    v_count INT := 0;
    v_skipped INT := 0;
    v_previous_seek TEXT;
    v_previous_seek_at TIMESTAMPTZ;
    v_previous_seek_version TEXT;
    v_previous_count INT;
    v_previous_skipped INT;
BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_limit := LEAST(coalesce(limits, 100), 1500);
    v_prefix := coalesce(prefix, '') || coalesce(search, '');
    v_prefix_lower := lower(v_prefix);
    v_prefix_len := length(coalesce(prefix, ''));
    v_prefix_start := coalesce(array_length(string_to_array(coalesce(prefix, ''), v_delimiter), 1), 1);
    v_combined_levels := coalesce(array_length(string_to_array(v_prefix, v_delimiter), 1), 1);
    v_is_asc := lower(coalesce(sortorder, 'asc')) = 'asc';
    v_file_batch_size := LEAST(GREATEST(v_limit * 2, 100), 1000);
    v_next_seek_at := NULL;
    v_next_seek_version := '';

    -- COALESCE first: NULL NOT IN (...) evaluates to NULL (not TRUE), so a
    -- bare NOT IN check silently leaves an explicit NULL argument unreset.
    noncurrent_versions := COALESCE(noncurrent_versions, 'exclude');
    delete_markers := COALESCE(delete_markers, 'exclude');
    IF noncurrent_versions NOT IN ('exclude', 'only', 'include') THEN
        noncurrent_versions := 'exclude';
    END IF;
    IF delete_markers NOT IN ('exclude', 'only', 'include') THEN
        delete_markers := 'exclude';
    END IF;

    v_multi_row := noncurrent_versions IN ('only', 'include');

    v_version_filter := '';
    IF noncurrent_versions = 'exclude' THEN
        v_version_filter := v_version_filter || ' AND o.archived_at IS NULL';
    ELSIF noncurrent_versions = 'only' THEN
        v_version_filter := v_version_filter || ' AND o.archived_at IS NOT NULL';
    END IF;
    IF delete_markers = 'exclude' THEN
        v_version_filter := v_version_filter || ' AND NOT o.is_delete_marker';
    ELSIF delete_markers = 'only' THEN
        v_version_filter := v_version_filter || ' AND o.is_delete_marker';
    END IF;

    -- Validate sort column
    CASE lower(coalesce(sortcolumn, 'name'))
        WHEN 'name' THEN v_order_by := 'name';
        WHEN 'updated_at' THEN v_order_by := 'updated_at';
        WHEN 'created_at' THEN v_order_by := 'created_at';
        WHEN 'last_accessed_at' THEN v_order_by := 'last_accessed_at';
        ELSE v_order_by := 'name';
    END CASE;

    v_sort_order := CASE WHEN v_is_asc THEN 'asc' ELSE 'desc' END;

    -- ========================================================================
    -- NON-NAME SORTING: Use path_tokens approach
    -- ========================================================================
    IF v_order_by != 'name' THEN
        RETURN QUERY EXECUTE format(
            $sql$
            WITH folders AS (
                SELECT array_to_string(path_tokens[$1:$2], '/') AS folder
                FROM storage.objects
                WHERE objects.name ILIKE $3 || '%%'
                  AND bucket_id = $4
                  AND array_length(objects.path_tokens, 1) <> $2
                  AND ($7 != 'exclude' OR objects.archived_at IS NULL)
                  AND ($7 != 'only' OR objects.archived_at IS NOT NULL)
                  AND ($8 != 'exclude' OR NOT objects.is_delete_marker)
                  AND ($8 != 'only' OR objects.is_delete_marker)
                GROUP BY folder
                ORDER BY folder %s
            )
            (SELECT folder AS "name",
                   NULL::uuid AS id,
                   NULL::timestamptz AS updated_at,
                   NULL::timestamptz AS created_at,
                   NULL::timestamptz AS last_accessed_at,
                   NULL::jsonb AS metadata,
                   NULL::text AS version,
                   NULL::timestamptz AS archived_at,
                   NULL::boolean AS is_delete_marker,
                   NULL::boolean AS is_versioned FROM folders)
            UNION ALL
            (SELECT array_to_string(path_tokens[$1:$2], '/') AS "name",
                   id, updated_at, created_at, last_accessed_at, metadata,
                   version, archived_at, is_delete_marker, is_versioned
             FROM storage.objects
             WHERE objects.name ILIKE $3 || '%%'
               AND bucket_id = $4
               AND array_length(objects.path_tokens, 1) = $2
               AND ($7 != 'exclude' OR objects.archived_at IS NULL)
               AND ($7 != 'only' OR objects.archived_at IS NOT NULL)
               AND ($8 != 'exclude' OR NOT objects.is_delete_marker)
               AND ($8 != 'only' OR objects.is_delete_marker)
             -- name, then version, as tiebreaks so two versions of the same
             -- key tying on the sort column still sort deterministically
             ORDER BY %I %s, name COLLATE "C" %s, COALESCE(version, '') %s)
            LIMIT $5 OFFSET $6
            $sql$, v_sort_order, v_order_by, v_sort_order, v_sort_order, v_sort_order
        ) USING v_prefix_start, v_combined_levels, v_prefix, bucketname, v_limit, offsets, noncurrent_versions, delete_markers;
        RETURN;
    END IF;

    -- ========================================================================
    -- NAME SORTING: Hybrid skip-scan with batch optimization
    -- ========================================================================

    -- Calculate upper bound for prefix filtering
    IF v_prefix_lower = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix_lower, 1) = v_delimiter THEN
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(v_delimiter) + 1);
    ELSE
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(right(v_prefix_lower, 1)) + 1);
    END IF;

    -- Build a resume-safe batch query. The exact-name branch returns remaining
    -- versions after the current (archived_at, version) boundary; the strict
    -- name branch returns subsequent keys. UNION ALL keeps both predicates
    -- independently indexable.
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT * FROM (' ||
                '(SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata, o.version, o.archived_at, o.is_delete_marker, o.is_versioned FROM storage.objects o ' ||
                'WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" = $2 AND ($5::timestamptz IS NULL OR COALESCE(o.archived_at, ''infinity''::timestamptz) < $5 OR (COALESCE(o.archived_at, ''infinity''::timestamptz) = $5 AND COALESCE(o.version, '''') > $6))' ||
                v_version_filter || ' ORDER BY COALESCE(o.archived_at, ''infinity''::timestamptz) DESC, COALESCE(o.version, '''') ASC LIMIT $4) UNION ALL ' ||
                '(SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata, o.version, o.archived_at, o.is_delete_marker, o.is_versioned FROM storage.objects o ' ||
                'WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" > $2 AND lower(o.name) COLLATE "C" < $3' || v_version_filter ||
                ' ORDER BY lower(o.name) COLLATE "C" ASC, COALESCE(o.archived_at, ''infinity''::timestamptz) DESC, COALESCE(o.version, '''') ASC LIMIT $4)' ||
                ') sub ORDER BY lower(sub.name) COLLATE "C" ASC, COALESCE(sub.archived_at, ''infinity''::timestamptz) DESC, COALESCE(sub.version, '''') ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT * FROM (' ||
                '(SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata, o.version, o.archived_at, o.is_delete_marker, o.is_versioned FROM storage.objects o ' ||
                'WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" = $2 AND ($5::timestamptz IS NULL OR COALESCE(o.archived_at, ''infinity''::timestamptz) < $5 OR (COALESCE(o.archived_at, ''infinity''::timestamptz) = $5 AND COALESCE(o.version, '''') > $6))' ||
                v_version_filter || ' ORDER BY COALESCE(o.archived_at, ''infinity''::timestamptz) DESC, COALESCE(o.version, '''') ASC LIMIT $4) UNION ALL ' ||
                '(SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata, o.version, o.archived_at, o.is_delete_marker, o.is_versioned FROM storage.objects o ' ||
                'WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" > $2' || v_version_filter ||
                ' ORDER BY lower(o.name) COLLATE "C" ASC, COALESCE(o.archived_at, ''infinity''::timestamptz) DESC, COALESCE(o.version, '''') ASC LIMIT $4)' ||
                ') sub ORDER BY lower(sub.name) COLLATE "C" ASC, COALESCE(sub.archived_at, ''infinity''::timestamptz) DESC, COALESCE(sub.version, '''') ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT * FROM (' ||
                '(SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata, o.version, o.archived_at, o.is_delete_marker, o.is_versioned FROM storage.objects o ' ||
                'WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" = $2 AND ($5::timestamptz IS NULL OR COALESCE(o.archived_at, ''infinity''::timestamptz) < $5 OR (COALESCE(o.archived_at, ''infinity''::timestamptz) = $5 AND COALESCE(o.version, '''') > $6))' ||
                v_version_filter || ' ORDER BY COALESCE(o.archived_at, ''infinity''::timestamptz) DESC, COALESCE(o.version, '''') ASC LIMIT $4) UNION ALL ' ||
                '(SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata, o.version, o.archived_at, o.is_delete_marker, o.is_versioned FROM storage.objects o ' ||
                'WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 AND lower(o.name) COLLATE "C" >= $3' || v_version_filter ||
                ' ORDER BY lower(o.name) COLLATE "C" DESC, COALESCE(o.archived_at, ''infinity''::timestamptz) DESC, COALESCE(o.version, '''') ASC LIMIT $4)' ||
                ') sub ORDER BY lower(sub.name) COLLATE "C" DESC, COALESCE(sub.archived_at, ''infinity''::timestamptz) DESC, COALESCE(sub.version, '''') ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT * FROM (' ||
                '(SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata, o.version, o.archived_at, o.is_delete_marker, o.is_versioned FROM storage.objects o ' ||
                'WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" = $2 AND ($5::timestamptz IS NULL OR COALESCE(o.archived_at, ''infinity''::timestamptz) < $5 OR (COALESCE(o.archived_at, ''infinity''::timestamptz) = $5 AND COALESCE(o.version, '''') > $6))' ||
                v_version_filter || ' ORDER BY COALESCE(o.archived_at, ''infinity''::timestamptz) DESC, COALESCE(o.version, '''') ASC LIMIT $4) UNION ALL ' ||
                '(SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata, o.version, o.archived_at, o.is_delete_marker, o.is_versioned FROM storage.objects o ' ||
                'WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2' || v_version_filter ||
                ' ORDER BY lower(o.name) COLLATE "C" DESC, COALESCE(o.archived_at, ''infinity''::timestamptz) DESC, COALESCE(o.version, '''') ASC LIMIT $4)' ||
                ') sub ORDER BY lower(sub.name) COLLATE "C" DESC, COALESCE(sub.archived_at, ''infinity''::timestamptz) DESC, COALESCE(sub.version, '''') ASC LIMIT $4';
        END IF;
    END IF;

    -- Keep the delete-marker predicate literal so the cached generic
    -- plan can use idx_objects_delete_markers during the main-loop peek.
    IF delete_markers = 'only' THEN
        IF v_multi_row THEN
            v_delete_marker_peek_query :=
                'SELECT marker_page.name FROM (' || v_batch_query || ') marker_page LIMIT 1';
        ELSIF v_is_asc THEN
            -- Two separate literal query strings, not one gated by a bound
            -- boolean: folding "$n AND op1 OR NOT $n AND op2" into a single
            -- query defeats the generic plan's ability to push either
            -- comparison into the index. Branching in PL/pgSQL control flow
            -- instead keeps each query's index condition intact.
            v_delete_marker_peek_query :=
                'SELECT o.name FROM storage.objects o WHERE o.bucket_id = $1 ' ||
                'AND lower(o.name) COLLATE "C" >= $2' ||
                CASE WHEN v_upper_bound IS NOT NULL
                    THEN ' AND lower(o.name) COLLATE "C" < $3'
                    ELSE ''
                END ||
                v_version_filter ||
                ' ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1';
            -- Strict variant: used once the single-row ASC batch advance
            -- (below) has left v_next_seek pointing at the last row already
            -- emitted, so a plain >= would re-match it forever.
            v_delete_marker_peek_query_strict :=
                'SELECT o.name FROM storage.objects o WHERE o.bucket_id = $1 ' ||
                'AND lower(o.name) COLLATE "C" > $2' ||
                CASE WHEN v_upper_bound IS NOT NULL
                    THEN ' AND lower(o.name) COLLATE "C" < $3'
                    ELSE ''
                END ||
                v_version_filter ||
                ' ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1';
        ELSE
            v_delete_marker_peek_query :=
                'SELECT o.name FROM storage.objects o WHERE o.bucket_id = $1 ' ||
                'AND lower(o.name) COLLATE "C" < $2' ||
                CASE WHEN v_upper_bound IS NOT NULL
                    THEN ' AND lower(o.name) COLLATE "C" >= $3'
                    ELSE ''
                END ||
                v_version_filter ||
                ' ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1';
        END IF;
    END IF;

    -- Initialize seek position
    IF v_is_asc THEN
        v_next_seek := v_prefix_lower;
    ELSE
        -- DESC performs one specialized initial seek so partial current-version
        -- and delete-marker indexes remain available.
        EXECUTE format(
            'SELECT o.name FROM storage.objects o WHERE o.bucket_id = $1%s%s ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1',
            CASE WHEN v_upper_bound IS NOT NULL
                THEN ' AND lower(o.name) COLLATE "C" >= $2 AND lower(o.name) COLLATE "C" < $3'
                ELSE ''
            END,
            v_version_filter
        )
        INTO v_peek_name
        USING bucketname, v_prefix_lower, v_upper_bound;

        IF v_peek_name IS NOT NULL THEN
            v_next_seek := lower(v_peek_name) || v_delimiter;
        ELSE
            RETURN;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch and
    -- the delete-marker-only path
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= v_limit;

        v_previous_seek := v_next_seek;
        v_previous_seek_at := v_next_seek_at;
        v_previous_seek_version := v_next_seek_version;
        v_previous_count := v_count;
        v_previous_skipped := v_skipped;

        -- STEP 1: PEEK
        v_peek_name := NULL;
        IF delete_markers = 'only' THEN
            EXECUTE CASE WHEN v_next_seek_strict
                THEN v_delete_marker_peek_query_strict
                ELSE v_delete_marker_peek_query
            END
                INTO v_peek_name
                USING bucketname, v_next_seek,
                    CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix_lower) ELSE v_prefix_lower END,
                    1, v_next_seek_at, v_next_seek_version;
        ELSIF v_multi_row AND v_next_seek_at IS NOT NULL THEN
            SELECT o.name INTO v_peek_name
            FROM storage.objects o
            WHERE o.bucket_id = bucketname
              AND lower(o.name) COLLATE "C" = v_next_seek
              AND (COALESCE(o.archived_at, 'infinity'::timestamptz) < v_next_seek_at
                   OR (COALESCE(o.archived_at, 'infinity'::timestamptz) = v_next_seek_at
                       AND COALESCE(o.version, '') > v_next_seek_version))
              AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
              AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
              AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
              AND (delete_markers != 'only' OR o.is_delete_marker)
            ORDER BY COALESCE(o.archived_at, 'infinity'::timestamptz) DESC,
                     COALESCE(o.version, '') ASC
            LIMIT 1;

            -- The current key is exhausted. Clear its version boundary and
            -- make the following ASC name peek strict. Appending '/' is not a
            -- valid lexical successor because keys ending in characters such
            -- as '!' sort between the exhausted name and name || '/'.
            IF v_peek_name IS NULL THEN
                IF v_is_asc THEN
                    v_next_seek_strict := true;
                END IF;
                v_next_seek_at := NULL;
                v_next_seek_version := '';
            END IF;
        END IF;

        -- Single-row mode is always noncurrent_versions='exclude'. Keep the
        -- current-row predicate literal so generic plans use the current index.
        IF delete_markers != 'only' AND v_peek_name IS NULL AND NOT v_multi_row THEN
            IF v_is_asc THEN
                IF v_next_seek_strict AND v_upper_bound IS NOT NULL THEN
                    SELECT o.name INTO v_peek_name FROM storage.objects o
                    WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" > v_next_seek AND lower(o.name) COLLATE "C" < v_upper_bound
                      AND o.archived_at IS NULL
                      AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                    ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
                ELSIF v_next_seek_strict THEN
                    SELECT o.name INTO v_peek_name FROM storage.objects o
                    WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" > v_next_seek
                      AND o.archived_at IS NULL
                      AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                    ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
                ELSIF v_upper_bound IS NOT NULL THEN
                    SELECT o.name INTO v_peek_name FROM storage.objects o
                    WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek AND lower(o.name) COLLATE "C" < v_upper_bound
                      AND o.archived_at IS NULL
                      AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                    ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
                ELSE
                    SELECT o.name INTO v_peek_name FROM storage.objects o
                    WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek
                      AND o.archived_at IS NULL
                      AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                    ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
                END IF;
            ELSIF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                  AND o.archived_at IS NULL
                  AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek
                  AND o.archived_at IS NULL
                  AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            END IF;
        ELSIF delete_markers != 'only' AND v_peek_name IS NULL AND v_is_asc THEN
            IF v_next_seek_strict AND v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" > v_next_seek AND lower(o.name) COLLATE "C" < v_upper_bound
                  AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                  AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                  AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                  AND (delete_markers != 'only' OR o.is_delete_marker)
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            ELSIF v_next_seek_strict THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" > v_next_seek
                  AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                  AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                  AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                  AND (delete_markers != 'only' OR o.is_delete_marker)
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            ELSIF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek AND lower(o.name) COLLATE "C" < v_upper_bound
                  AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                  AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                  AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                  AND (delete_markers != 'only' OR o.is_delete_marker)
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek
                  AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                  AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                  AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                  AND (delete_markers != 'only' OR o.is_delete_marker)
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSIF delete_markers != 'only' AND v_peek_name IS NULL THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                  AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                  AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                  AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                  AND (delete_markers != 'only' OR o.is_delete_marker)
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek
                  AND (noncurrent_versions != 'exclude' OR o.archived_at IS NULL)
                  AND (noncurrent_versions != 'only' OR o.archived_at IS NOT NULL)
                  AND (delete_markers != 'exclude' OR NOT o.is_delete_marker)
                  AND (delete_markers != 'only' OR o.is_delete_marker)
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- If the peek landed on a different key than we were tracking, any
        -- version boundary belongs to the OLD key and must not leak into the
        -- new one - e.g. the deleteMarkers='only' peek doesn't know or care
        -- whether it's continuing the same key or jumping to a new one, so
        -- it never clears these itself.
        IF lower(v_peek_name) IS DISTINCT FROM v_next_seek THEN
            v_next_seek_at := NULL;
            v_next_seek_version := '';
        END IF;

        -- The peek is authoritative for the next key to process. This is
        -- especially important after exhausting a multi-version key: the
        -- version boundary has been cleared, so executing the batch against
        -- a stale v_next_seek would replay every version of that old key.
        v_next_seek := lower(v_peek_name);
        v_next_seek_strict := false;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(lower(v_peek_name), v_prefix_lower, v_delimiter);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Handle offset, emit if needed, skip to next folder
            IF v_skipped < offsets THEN
                v_skipped := v_skipped + 1;
            ELSE
                name := substring(rtrim(storage.get_common_prefix(v_peek_name, v_prefix, v_delimiter), v_delimiter) from v_prefix_len + 1);
                id := NULL;
                updated_at := NULL;
                created_at := NULL;
                last_accessed_at := NULL;
                metadata := NULL;
                version := NULL;
                archived_at := NULL;
                is_delete_marker := NULL;
                is_versioned := NULL;
                RETURN NEXT;
                v_count := v_count + 1;
            END IF;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := lower(left(v_common_prefix, -1)) || chr(ascii(v_delimiter) + 1);
            ELSE
                v_next_seek := lower(v_common_prefix);
            END IF;
            v_next_seek_at := NULL;
            v_next_seek_version := '';
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix_lower is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query
                USING bucketname, v_next_seek,
                    CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix_lower) ELSE v_prefix_lower END, v_file_batch_size,
                    v_next_seek_at, v_next_seek_version
            LOOP
                v_common_prefix := storage.get_common_prefix(lower(v_current.name), v_prefix_lower, v_delimiter);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it. Reset
                    -- strict mode too - it may have been set by an earlier
                    -- row in this same batch (see the single-row ASC advance
                    -- below), and v_next_seek here is the folder-triggering
                    -- row's own name, which the next peek must find inclusively.
                    v_next_seek := CASE
                        WHEN v_is_asc THEN lower(v_current.name)
                        ELSE lower(v_current.name) || v_delimiter
                    END;
                    v_next_seek_at := NULL;
                    v_next_seek_version := '';
                    v_next_seek_strict := false;
                    EXIT;
                END IF;

                -- Handle offset skipping
                IF v_skipped < offsets THEN
                    v_skipped := v_skipped + 1;
                ELSE
                    -- Emit file
                    name := substring(v_current.name from v_prefix_len + 1);
                    id := v_current.id;
                    updated_at := v_current.updated_at;
                    created_at := v_current.created_at;
                    last_accessed_at := v_current.last_accessed_at;
                    metadata := v_current.metadata;
                    version := v_current.version;
                    archived_at := v_current.archived_at;
                    is_delete_marker := v_current.is_delete_marker;
                    is_versioned := v_current.is_versioned;
                    RETURN NEXT;
                    v_count := v_count + 1;
                END IF;

                -- Multi-row mode must remain on this key until all of its
                -- versions have crossed the internal batch boundary.
                IF v_multi_row THEN
                    v_next_seek := lower(v_current.name);
                    v_next_seek_at := COALESCE(v_current.archived_at, 'infinity'::timestamptz);
                    v_next_seek_version := COALESCE(v_current.version, '');
                ELSIF v_is_asc THEN
                    -- Appending the delimiter as a fake lexical successor would
                    -- skip a real key like `name || '!'` (or any character
                    -- sorting below the delimiter), which sorts between `name`
                    -- and `name || delimiter`. Track the real name and mark the
                    -- next comparison strict instead - same fix as the
                    -- exhausted-key case above.
                    v_next_seek := lower(v_current.name);
                    v_next_seek_strict := true;
                ELSE
                    v_next_seek := lower(v_current.name);
                END IF;

                EXIT WHEN v_count >= v_limit;
            END LOOP;
        END IF;

        IF v_count = v_previous_count
           AND v_skipped = v_previous_skipped
           AND v_next_seek IS NOT DISTINCT FROM v_previous_seek
           AND v_next_seek_at IS NOT DISTINCT FROM v_previous_seek_at
           AND v_next_seek_version IS NOT DISTINCT FROM v_previous_seek_version THEN
            RAISE EXCEPTION 'storage.search made no progress at seek (%, %, %)',
                v_next_seek, v_next_seek_at, v_next_seek_version;
        END IF;
    END LOOP;
END;
$_$;


--
-- Name: search_by_timestamp(text, text, integer, integer, text, text, text, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text, noncurrent_versions text DEFAULT 'exclude'::text, delete_markers text DEFAULT 'exclude'::text, p_start_after_version text DEFAULT ''::text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb, version text, archived_at timestamp with time zone, is_delete_marker boolean, is_versioned boolean)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_cursor_op text;
    v_query text;
    v_prefix text;
    v_prefix_pattern text;
    v_sort_order text;
    v_sort_column text;
    v_version_tiebreak text;
BEGIN
    v_prefix := coalesce(p_prefix, '');
    -- Keep the raw prefix for common-prefix calculations and escape only LIKE metacharacters.
    v_prefix_pattern := replace(v_prefix, chr(92), chr(92) || chr(92));
    v_prefix_pattern := replace(v_prefix_pattern, '%', chr(92) || '%');
    v_prefix_pattern := replace(v_prefix_pattern, '_', chr(92) || '_');

    -- COALESCE first: NULL NOT IN (...) evaluates to NULL (not TRUE), so a
    -- bare NOT IN check silently leaves an explicit NULL argument unreset.
    noncurrent_versions := COALESCE(noncurrent_versions, 'exclude');
    delete_markers := COALESCE(delete_markers, 'exclude');
    IF noncurrent_versions NOT IN ('exclude', 'only', 'include') THEN
        noncurrent_versions := 'exclude';
    END IF;
    IF delete_markers NOT IN ('exclude', 'only', 'include') THEN
        delete_markers := 'exclude';
    END IF;

    -- $9 is only populated in multi-row mode; it's always '' otherwise, so
    -- only use each row's real version as a tiebreak in multi-row mode.
    v_version_tiebreak := CASE WHEN noncurrent_versions IN ('only', 'include') THEN 'COALESCE(version, '''')' ELSE '''''' END;

    -- Defense-in-depth: this function is independently reachable and must
    -- not trust p_sort_order/p_sort_column to already be validated by a
    -- caller. Normalize to the same strict allow-list storage.search_v2
    -- uses before interpolating anything into dynamic SQL below.
    v_sort_order := lower(coalesce(p_sort_order, 'asc'));
    IF v_sort_order NOT IN ('asc', 'desc') THEN
        v_sort_order := 'asc';
    END IF;

    v_sort_column := lower(coalesce(p_sort_column, 'updated_at'));
    IF v_sort_column NOT IN ('updated_at', 'created_at') THEN
        v_sort_column := 'updated_at';
    END IF;

    IF v_sort_order = 'asc' THEN
        v_cursor_op := '>';
    ELSE
        v_cursor_op := '<';
    END IF;

    v_query := format($sql$
        WITH raw_objects AS (
            SELECT
                o.name AS obj_name,
                o.id AS obj_id,
                o.updated_at AS obj_updated_at,
                o.created_at AS obj_created_at,
                o.last_accessed_at AS obj_last_accessed_at,
                o.metadata AS obj_metadata,
                o.version AS obj_version,
                o.archived_at AS obj_archived_at,
                o.is_delete_marker AS obj_is_delete_marker,
                o.is_versioned AS obj_is_versioned,
                storage.get_common_prefix(o.name, $1, '/') AS common_prefix
            FROM storage.objects o
            WHERE o.bucket_id = $2
              AND o.name COLLATE "C" LIKE $10 || '%%'
              AND ($7 != 'exclude' OR o.archived_at IS NULL)
              AND ($7 != 'only' OR o.archived_at IS NOT NULL)
              AND ($8 != 'exclude' OR NOT o.is_delete_marker)
              AND ($8 != 'only' OR o.is_delete_marker)
        ),
        -- Aggregate common prefixes (folders)
        -- Both created_at and updated_at use MIN(obj_created_at) to match the old prefixes table behavior
        aggregated_prefixes AS (
            SELECT
                common_prefix AS name,
                NULL::uuid AS id,
                MIN(obj_created_at) AS updated_at,
                MIN(obj_created_at) AS created_at,
                NULL::timestamptz AS last_accessed_at,
                NULL::jsonb AS metadata,
                NULL::text AS version,
                NULL::timestamptz AS archived_at,
                NULL::boolean AS is_delete_marker,
                NULL::boolean AS is_versioned,
                TRUE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NOT NULL
            GROUP BY common_prefix
        ),
        leaf_objects AS (
            SELECT
                obj_name AS name,
                obj_id AS id,
                obj_updated_at AS updated_at,
                obj_created_at AS created_at,
                obj_last_accessed_at AS last_accessed_at,
                obj_metadata AS metadata,
                obj_version AS version,
                obj_archived_at AS archived_at,
                obj_is_delete_marker AS is_delete_marker,
                obj_is_versioned AS is_versioned,
                FALSE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NULL
        ),
        combined AS (
            SELECT * FROM aggregated_prefixes
            UNION ALL
            SELECT * FROM leaf_objects
        ),
        filtered AS (
            SELECT *
            FROM combined
            WHERE (
                $5 = ''
                OR ROW(
                    COALESCE(date_trunc('milliseconds', %I), 'epoch'::timestamptz),
                    name COLLATE "C",
                    %s
                ) %s ROW(
                    -- truncated the same way as the stored value above
                    date_trunc('milliseconds', COALESCE(NULLIF($6, '')::timestamptz, 'epoch'::timestamptz)),
                    $5,
                    $9
                )
            )
        )
        SELECT
            split_part(name, '/', $3) AS key,
            name,
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata,
            version,
            archived_at,
            is_delete_marker,
            is_versioned
        FROM filtered
        ORDER BY
            COALESCE(date_trunc('milliseconds', %I), 'epoch'::timestamptz) %s,
            name COLLATE "C" %s,
            COALESCE(version, '') %s
        LIMIT $4
    $sql$,
        v_sort_column,
        v_version_tiebreak,
        v_cursor_op,
        v_sort_column,
        v_sort_order,
        v_sort_order,
        v_sort_order
    );

    -- version is the third tiebreak component for two versions of the same
    -- key tying on both timestamp and name (see filtered CTE / ORDER BY above)
    RETURN QUERY EXECUTE v_query
    USING v_prefix, p_bucket_id, p_level, p_limit, p_start_after, p_sort_column_after, noncurrent_versions, delete_markers, coalesce(p_start_after_version, ''), v_prefix_pattern;
END;
$_$;


--
-- Name: search_v2(text, text, integer, integer, text, text, text, text, text, text, timestamp with time zone, text, boolean); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text, sort_column text DEFAULT 'name'::text, sort_column_after text DEFAULT ''::text, noncurrent_versions text DEFAULT 'exclude'::text, delete_markers text DEFAULT 'exclude'::text, start_after_archived_at timestamp with time zone DEFAULT NULL::timestamp with time zone, start_after_version text DEFAULT ''::text, start_after_is_continuation boolean DEFAULT false) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb, version text, archived_at timestamp with time zone, is_delete_marker boolean, is_versioned boolean)
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    v_sort_col text;
    v_sort_ord text;
    v_limit int;
BEGIN
    -- Cap limit to maximum of 1500 records
    v_limit := LEAST(coalesce(limits, 100), 1500);

    -- Validate and normalize sort_order
    v_sort_ord := lower(coalesce(sort_order, 'asc'));
    IF v_sort_ord NOT IN ('asc', 'desc') THEN
        v_sort_ord := 'asc';
    END IF;

    -- Validate and normalize sort_column
    v_sort_col := lower(coalesce(sort_column, 'name'));
    IF v_sort_col NOT IN ('name', 'updated_at', 'created_at') THEN
        v_sort_col := 'name';
    END IF;

    -- Route to appropriate implementation
    IF v_sort_col = 'name' THEN
        -- Use list_objects_with_delimiter for name sorting (most efficient: O(k * log n))
        RETURN QUERY
        SELECT
            split_part(l.name, '/', levels) AS key,
            l.name AS name,
            l.id,
            l.updated_at,
            l.created_at,
            l.last_accessed_at,
            l.metadata,
            l.version,
            l.archived_at,
            l.is_delete_marker,
            l.is_versioned
        FROM storage.list_objects_with_delimiter(
            bucket_name,
            coalesce(prefix, ''),
            '/',
            v_limit,
            CASE WHEN start_after_is_continuation THEN '' ELSE start_after END,
            CASE WHEN start_after_is_continuation THEN start_after ELSE '' END,
            v_sort_ord,
            noncurrent_versions,
            delete_markers,
            start_after_archived_at,
            start_after_version
        ) l;
    ELSE
        -- Use aggregation approach for timestamp sorting
        -- Not efficient for large datasets but supports correct pagination
        RETURN QUERY SELECT * FROM storage.search_by_timestamp(
            prefix, bucket_name, v_limit, levels, start_after,
            v_sort_ord, v_sort_col, sort_column_after,
            noncurrent_versions, delete_markers, start_after_version
        );
    END IF;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.audit_log_entries (
    instance_id uuid,
    id uuid NOT NULL,
    payload json,
    created_at timestamp with time zone,
    ip_address character varying(64) DEFAULT ''::character varying NOT NULL
);


--
-- Name: TABLE audit_log_entries; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.audit_log_entries IS 'Auth: Audit trail for user actions.';


--
-- Name: custom_oauth_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.custom_oauth_providers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_type text NOT NULL,
    identifier text NOT NULL,
    name text NOT NULL,
    client_id text NOT NULL,
    client_secret text NOT NULL,
    acceptable_client_ids text[] DEFAULT '{}'::text[] NOT NULL,
    scopes text[] DEFAULT '{}'::text[] NOT NULL,
    pkce_enabled boolean DEFAULT true NOT NULL,
    attribute_mapping jsonb DEFAULT '{}'::jsonb NOT NULL,
    authorization_params jsonb DEFAULT '{}'::jsonb NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    email_optional boolean DEFAULT false NOT NULL,
    issuer text,
    discovery_url text,
    skip_nonce_check boolean DEFAULT false NOT NULL,
    cached_discovery jsonb,
    discovery_cached_at timestamp with time zone,
    authorization_url text,
    token_url text,
    userinfo_url text,
    jwks_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    custom_claims_allowlist text[] DEFAULT '{}'::text[] NOT NULL,
    CONSTRAINT custom_oauth_providers_authorization_url_https CHECK (((authorization_url IS NULL) OR (authorization_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_authorization_url_length CHECK (((authorization_url IS NULL) OR (char_length(authorization_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_client_id_length CHECK (((char_length(client_id) >= 1) AND (char_length(client_id) <= 512))),
    CONSTRAINT custom_oauth_providers_discovery_url_length CHECK (((discovery_url IS NULL) OR (char_length(discovery_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_identifier_format CHECK ((identifier ~ '^[a-z0-9][a-z0-9:-]{0,48}[a-z0-9]$'::text)),
    CONSTRAINT custom_oauth_providers_issuer_length CHECK (((issuer IS NULL) OR ((char_length(issuer) >= 1) AND (char_length(issuer) <= 2048)))),
    CONSTRAINT custom_oauth_providers_jwks_uri_https CHECK (((jwks_uri IS NULL) OR (jwks_uri ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_jwks_uri_length CHECK (((jwks_uri IS NULL) OR (char_length(jwks_uri) <= 2048))),
    CONSTRAINT custom_oauth_providers_name_length CHECK (((char_length(name) >= 1) AND (char_length(name) <= 100))),
    CONSTRAINT custom_oauth_providers_oauth2_requires_endpoints CHECK (((provider_type <> 'oauth2'::text) OR ((authorization_url IS NOT NULL) AND (token_url IS NOT NULL) AND (userinfo_url IS NOT NULL)))),
    CONSTRAINT custom_oauth_providers_oidc_discovery_url_https CHECK (((provider_type <> 'oidc'::text) OR (discovery_url IS NULL) OR (discovery_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_issuer_https CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NULL) OR (issuer ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_requires_issuer CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NOT NULL))),
    CONSTRAINT custom_oauth_providers_provider_type_check CHECK ((provider_type = ANY (ARRAY['oauth2'::text, 'oidc'::text]))),
    CONSTRAINT custom_oauth_providers_token_url_https CHECK (((token_url IS NULL) OR (token_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_token_url_length CHECK (((token_url IS NULL) OR (char_length(token_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_userinfo_url_https CHECK (((userinfo_url IS NULL) OR (userinfo_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_userinfo_url_length CHECK (((userinfo_url IS NULL) OR (char_length(userinfo_url) <= 2048)))
);


--
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.flow_state (
    id uuid NOT NULL,
    user_id uuid,
    auth_code text,
    code_challenge_method auth.code_challenge_method,
    code_challenge text,
    provider_type text NOT NULL,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    authentication_method text NOT NULL,
    auth_code_issued_at timestamp with time zone,
    invite_token text,
    referrer text,
    oauth_client_state_id uuid,
    linking_target_id uuid,
    email_optional boolean DEFAULT false NOT NULL
);


--
-- Name: TABLE flow_state; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.flow_state IS 'Stores metadata for all OAuth/SSO login flows';


--
-- Name: identities; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.identities (
    provider_id text NOT NULL,
    user_id uuid NOT NULL,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    last_sign_in_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email text GENERATED ALWAYS AS (lower((identity_data ->> 'email'::text))) STORED,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: TABLE identities; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.identities IS 'Auth: Stores identities associated to a user.';


--
-- Name: COLUMN identities.email; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.identities.email IS 'Auth: Email is a generated column that references the optional email property in the identity_data';


--
-- Name: instances; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.instances (
    id uuid NOT NULL,
    uuid uuid,
    raw_base_config text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: TABLE instances; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.instances IS 'Auth: Manages users across multiple sites.';


--
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL
);


--
-- Name: TABLE mfa_amr_claims; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_amr_claims IS 'auth: stores authenticator method reference claims for multi factor authentication';


--
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_challenges (
    id uuid NOT NULL,
    factor_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    ip_address inet NOT NULL,
    otp_code text,
    web_authn_session_data jsonb
);


--
-- Name: TABLE mfa_challenges; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_challenges IS 'auth: stores metadata about challenge requests made';


--
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_factors (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    friendly_name text,
    factor_type auth.factor_type NOT NULL,
    status auth.factor_status NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    secret text,
    phone text,
    last_challenged_at timestamp with time zone,
    web_authn_credential jsonb,
    web_authn_aaguid uuid,
    last_webauthn_challenge_data jsonb
);


--
-- Name: TABLE mfa_factors; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_factors IS 'auth: stores metadata about factors';


--
-- Name: COLUMN mfa_factors.last_webauthn_challenge_data; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.mfa_factors.last_webauthn_challenge_data IS 'Stores the latest WebAuthn challenge data including attestation/assertion for customer verification';


--
-- Name: mfa_recovery_code_sets; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_recovery_code_sets (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    mfa_factor_id uuid NOT NULL,
    failed_verification_count integer DEFAULT 0 NOT NULL,
    verification_locked_until timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mfa_recovery_code_sets_failed_verification_count_check CHECK ((failed_verification_count >= 0))
);


--
-- Name: mfa_recovery_codes; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_recovery_codes (
    id uuid NOT NULL,
    mfa_recovery_code_set_id uuid NOT NULL,
    code_hash text NOT NULL,
    consumed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: oauth_authorizations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_authorizations (
    id uuid NOT NULL,
    authorization_id text NOT NULL,
    client_id uuid NOT NULL,
    user_id uuid,
    redirect_uri text NOT NULL,
    scope text NOT NULL,
    state text,
    resource text,
    code_challenge text,
    code_challenge_method auth.code_challenge_method,
    response_type auth.oauth_response_type DEFAULT 'code'::auth.oauth_response_type NOT NULL,
    status auth.oauth_authorization_status DEFAULT 'pending'::auth.oauth_authorization_status NOT NULL,
    authorization_code text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:03:00'::interval) NOT NULL,
    approved_at timestamp with time zone,
    nonce text,
    CONSTRAINT oauth_authorizations_authorization_code_length CHECK ((char_length(authorization_code) <= 255)),
    CONSTRAINT oauth_authorizations_code_challenge_length CHECK ((char_length(code_challenge) <= 128)),
    CONSTRAINT oauth_authorizations_expires_at_future CHECK ((expires_at > created_at)),
    CONSTRAINT oauth_authorizations_nonce_length CHECK ((char_length(nonce) <= 255)),
    CONSTRAINT oauth_authorizations_redirect_uri_length CHECK ((char_length(redirect_uri) <= 2048)),
    CONSTRAINT oauth_authorizations_resource_length CHECK ((char_length(resource) <= 2048)),
    CONSTRAINT oauth_authorizations_scope_length CHECK ((char_length(scope) <= 4096)),
    CONSTRAINT oauth_authorizations_state_length CHECK ((char_length(state) <= 4096))
);


--
-- Name: oauth_client_states; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_client_states (
    id uuid NOT NULL,
    provider_type text NOT NULL,
    code_verifier text,
    created_at timestamp with time zone NOT NULL
);


--
-- Name: TABLE oauth_client_states; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.oauth_client_states IS 'Stores OAuth states for third-party provider authentication flows where Supabase acts as the OAuth client.';


--
-- Name: oauth_clients; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_clients (
    id uuid NOT NULL,
    client_secret_hash text,
    registration_type auth.oauth_registration_type NOT NULL,
    redirect_uris text NOT NULL,
    grant_types text NOT NULL,
    client_name text,
    client_uri text,
    logo_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    client_type auth.oauth_client_type DEFAULT 'confidential'::auth.oauth_client_type NOT NULL,
    token_endpoint_auth_method text NOT NULL,
    CONSTRAINT oauth_clients_client_name_length CHECK ((char_length(client_name) <= 1024)),
    CONSTRAINT oauth_clients_client_uri_length CHECK ((char_length(client_uri) <= 2048)),
    CONSTRAINT oauth_clients_logo_uri_length CHECK ((char_length(logo_uri) <= 2048)),
    CONSTRAINT oauth_clients_token_endpoint_auth_method_check CHECK ((token_endpoint_auth_method = ANY (ARRAY['client_secret_basic'::text, 'client_secret_post'::text, 'none'::text])))
);


--
-- Name: oauth_consents; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_consents (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    client_id uuid NOT NULL,
    scopes text NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    CONSTRAINT oauth_consents_revoked_after_granted CHECK (((revoked_at IS NULL) OR (revoked_at >= granted_at))),
    CONSTRAINT oauth_consents_scopes_length CHECK ((char_length(scopes) <= 2048)),
    CONSTRAINT oauth_consents_scopes_not_empty CHECK ((char_length(TRIM(BOTH FROM scopes)) > 0))
);


--
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.one_time_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_type auth.one_time_token_type NOT NULL,
    token_hash text NOT NULL,
    relates_to text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    CONSTRAINT one_time_tokens_token_hash_check CHECK ((char_length(token_hash) > 0))
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.refresh_tokens (
    instance_id uuid,
    id bigint NOT NULL,
    token character varying(255),
    user_id character varying(255),
    revoked boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent character varying(255),
    session_id uuid
);


--
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: -
--

CREATE SEQUENCE auth.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: -
--

ALTER SEQUENCE auth.refresh_tokens_id_seq OWNED BY auth.refresh_tokens.id;


--
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.saml_providers (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    entity_id text NOT NULL,
    metadata_xml text NOT NULL,
    metadata_url text,
    attribute_mapping jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    name_id_format text,
    CONSTRAINT "entity_id not empty" CHECK ((char_length(entity_id) > 0)),
    CONSTRAINT "metadata_url not empty" CHECK (((metadata_url = NULL::text) OR (char_length(metadata_url) > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK ((char_length(metadata_xml) > 0))
);


--
-- Name: TABLE saml_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';


--
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.saml_relay_states (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    request_id text NOT NULL,
    for_email text,
    redirect_to text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    flow_state_id uuid,
    CONSTRAINT "request_id not empty" CHECK ((char_length(request_id) > 0))
);


--
-- Name: TABLE saml_relay_states; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.schema_migrations (
    version character varying(255) NOT NULL
);


--
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.schema_migrations IS 'Auth: Manages updates to the auth system.';


--
-- Name: scim_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.scim_tokens (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    token_hash text NOT NULL,
    prefix text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    revoked_at timestamp with time zone,
    last_used_at timestamp with time zone,
    CONSTRAINT scim_tokens_expires_at_future CHECK (((expires_at IS NULL) OR (expires_at > created_at))),
    CONSTRAINT scim_tokens_revoked_after_created CHECK (((revoked_at IS NULL) OR (revoked_at >= created_at))),
    CONSTRAINT scim_tokens_token_hash_check CHECK ((token_hash ~ '^[0-9a-f]{64}$'::text))
);


--
-- Name: scim_users; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.scim_users (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    user_id uuid,
    resource jsonb NOT NULL,
    user_name text GENERATED ALWAYS AS (lower((resource ->> 'userName'::text))) STORED NOT NULL,
    external_id text GENERATED ALWAYS AS ((resource ->> 'externalId'::text)) STORED,
    active boolean GENERATED ALWAYS AS (COALESCE(((resource ->> 'active'::text))::boolean, true)) STORED NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: sessions; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    factor_id uuid,
    aal auth.aal_level,
    not_after timestamp with time zone,
    refreshed_at timestamp without time zone,
    user_agent text,
    ip inet,
    tag text,
    oauth_client_id uuid,
    refresh_token_hmac_key text,
    refresh_token_counter bigint,
    scopes text,
    CONSTRAINT sessions_scopes_length CHECK ((char_length(scopes) <= 4096))
);


--
-- Name: TABLE sessions; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sessions IS 'Auth: Stores session data associated to a user.';


--
-- Name: COLUMN sessions.not_after; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.not_after IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- Name: COLUMN sessions.refresh_token_hmac_key; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.refresh_token_hmac_key IS 'Holds a HMAC-SHA256 key used to sign refresh tokens for this session.';


--
-- Name: COLUMN sessions.refresh_token_counter; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.refresh_token_counter IS 'Holds the ID (counter) of the last issued refresh token.';


--
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK ((char_length(domain) > 0))
);


--
-- Name: TABLE sso_domains; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    disabled boolean,
    CONSTRAINT "resource_id not empty" CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)))
);


--
-- Name: TABLE sso_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- Name: COLUMN sso_providers.resource_id; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sso_providers.resource_id IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- Name: users; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.users (
    instance_id uuid,
    id uuid NOT NULL,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone text DEFAULT NULL::character varying,
    phone_confirmed_at timestamp with time zone,
    phone_change text DEFAULT ''::character varying,
    phone_change_token character varying(255) DEFAULT ''::character varying,
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
    email_change_token_current character varying(255) DEFAULT ''::character varying,
    email_change_confirm_status smallint DEFAULT 0,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255) DEFAULT ''::character varying,
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    is_anonymous boolean DEFAULT false NOT NULL,
    CONSTRAINT users_email_change_confirm_status_check CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)))
);


--
-- Name: TABLE users; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';


--
-- Name: COLUMN users.is_sso_user; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- Name: webauthn_challenges; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.webauthn_challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    challenge_type text NOT NULL,
    session_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    CONSTRAINT webauthn_challenges_challenge_type_check CHECK ((challenge_type = ANY (ARRAY['signup'::text, 'registration'::text, 'authentication'::text])))
);


--
-- Name: webauthn_credentials; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.webauthn_credentials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    credential_id bytea NOT NULL,
    public_key bytea NOT NULL,
    attestation_type text DEFAULT ''::text NOT NULL,
    aaguid uuid,
    sign_count bigint DEFAULT 0 NOT NULL,
    transports jsonb DEFAULT '[]'::jsonb NOT NULL,
    backup_eligible boolean DEFAULT false NOT NULL,
    backed_up boolean DEFAULT false NOT NULL,
    friendly_name text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_used_at timestamp with time zone
);


--
-- Name: accounts_usuario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts_usuario (
    id bigint NOT NULL,
    password character varying(128) NOT NULL,
    last_login timestamp with time zone,
    nombre character varying(120) NOT NULL,
    correo character varying(254) NOT NULL,
    celular character varying(20) NOT NULL,
    rol character varying(15) NOT NULL,
    estado character varying(15) NOT NULL,
    fecha_registro timestamp with time zone NOT NULL,
    is_staff boolean NOT NULL,
    is_superuser boolean NOT NULL,
    CONSTRAINT usuario_estado_valido CHECK (((estado)::text = ANY ((ARRAY['activo'::character varying, 'suspendido'::character varying])::text[]))),
    CONSTRAINT usuario_rol_valido CHECK (((rol)::text = ANY ((ARRAY['comprador'::character varying, 'vendedor'::character varying, 'administrador'::character varying])::text[])))
);


--
-- Name: accounts_usuario_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts_usuario_groups (
    id bigint NOT NULL,
    usuario_id bigint NOT NULL,
    group_id integer NOT NULL
);


--
-- Name: accounts_usuario_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.accounts_usuario_groups ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.accounts_usuario_groups_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: accounts_usuario_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.accounts_usuario ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.accounts_usuario_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: accounts_usuario_user_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts_usuario_user_permissions (
    id bigint NOT NULL,
    usuario_id bigint NOT NULL,
    permission_id integer NOT NULL
);


--
-- Name: accounts_usuario_user_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.accounts_usuario_user_permissions ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.accounts_usuario_user_permissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: accounts_vendedor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts_vendedor (
    id bigint NOT NULL,
    numero_cedula bytea,
    cedula_huella character varying(64),
    foto_cedula character varying(100),
    estado_verificacion character varying(15) NOT NULL,
    motivo_rechazo text NOT NULL,
    fecha_solicitud timestamp with time zone NOT NULL,
    fecha_revision timestamp with time zone,
    id_revisor_id bigint,
    id_usuario_id bigint NOT NULL,
    CONSTRAINT vendedor_estado_verificacion_valido CHECK (((estado_verificacion)::text = ANY ((ARRAY['pendiente'::character varying, 'aprobado'::character varying, 'rechazado'::character varying])::text[])))
);


--
-- Name: accounts_vendedor_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.accounts_vendedor ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.accounts_vendedor_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: addresses_direccion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.addresses_direccion (
    id bigint NOT NULL,
    alias character varying(50) NOT NULL,
    direccion character varying(200) NOT NULL,
    referencia character varying(150) NOT NULL,
    latitud numeric(9,6),
    longitud numeric(9,6),
    es_predeterminada boolean NOT NULL,
    activa boolean NOT NULL,
    fecha_creacion timestamp with time zone NOT NULL,
    fecha_actualizacion timestamp with time zone NOT NULL,
    id_usuario_id bigint NOT NULL,
    CONSTRAINT direccion_coordenadas_completas CHECK ((((latitud IS NULL) AND (longitud IS NULL)) OR ((latitud IS NOT NULL) AND (longitud IS NOT NULL)))),
    CONSTRAINT direccion_predeterminada_activa CHECK (((NOT es_predeterminada) OR activa))
);


--
-- Name: addresses_direccion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.addresses_direccion ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.addresses_direccion_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: audit_registroauditoria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_registroauditoria (
    id bigint NOT NULL,
    accion character varying(20) NOT NULL,
    entidad character varying(50) NOT NULL,
    id_entidad bigint,
    detalle jsonb NOT NULL,
    direccion_ip inet,
    fecha_creacion timestamp with time zone NOT NULL,
    id_usuario_id bigint,
    CONSTRAINT audit_registroauditoria_id_entidad_check CHECK ((id_entidad >= 0))
);


--
-- Name: audit_registroauditoria_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.audit_registroauditoria ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.audit_registroauditoria_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: auth_group; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_group (
    id integer NOT NULL,
    name character varying(150) NOT NULL
);


--
-- Name: auth_group_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.auth_group ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.auth_group_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: auth_group_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_group_permissions (
    id bigint NOT NULL,
    group_id integer NOT NULL,
    permission_id integer NOT NULL
);


--
-- Name: auth_group_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.auth_group_permissions ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.auth_group_permissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: auth_permission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_permission (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    content_type_id integer NOT NULL,
    codename character varying(100) NOT NULL
);


--
-- Name: auth_permission_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.auth_permission ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.auth_permission_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: catalog_categoria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.catalog_categoria (
    id bigint NOT NULL,
    nombre character varying(80) NOT NULL,
    activa boolean NOT NULL,
    id_categoria_padre_id bigint
);


--
-- Name: catalog_categoria_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.catalog_categoria ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.catalog_categoria_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: catalog_imagenproducto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.catalog_imagenproducto (
    id bigint NOT NULL,
    archivo character varying(100) NOT NULL,
    orden integer NOT NULL,
    id_producto_id bigint NOT NULL,
    CONSTRAINT catalog_imagenproducto_orden_check CHECK ((orden >= 0))
);


--
-- Name: catalog_imagenproducto_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.catalog_imagenproducto ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.catalog_imagenproducto_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: catalog_producto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.catalog_producto (
    id bigint NOT NULL,
    nombre character varying(120) NOT NULL,
    descripcion text NOT NULL,
    precio numeric(12,2) NOT NULL,
    stock integer NOT NULL,
    unidad_medida character varying(15) NOT NULL,
    estado character varying(15) NOT NULL,
    id_categoria_id bigint NOT NULL,
    id_puesto_id bigint NOT NULL,
    CONSTRAINT producto_estado_valido CHECK (((estado)::text = ANY ((ARRAY['activo'::character varying, 'inactivo'::character varying, 'bloqueado'::character varying])::text[]))),
    CONSTRAINT producto_precio_no_negativo CHECK ((precio >= (0)::numeric)),
    CONSTRAINT producto_stock_no_negativo CHECK ((stock >= 0)),
    CONSTRAINT producto_unidad_valida CHECK (((unidad_medida)::text = ANY ((ARRAY['kg'::character varying, 'libra'::character varying, 'unidad'::character varying, 'docena'::character varying, 'litro'::character varying, 'porcion'::character varying])::text[])))
);


--
-- Name: catalog_producto_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.catalog_producto ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.catalog_producto_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: catalog_puesto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.catalog_puesto (
    id bigint NOT NULL,
    nombre character varying(120) NOT NULL,
    descripcion text NOT NULL,
    direccion character varying(200) NOT NULL,
    latitud numeric(9,6),
    longitud numeric(9,6),
    horario character varying(120) NOT NULL,
    ofrece_domicilio boolean NOT NULL,
    estado character varying(15) NOT NULL,
    id_vendedor_id bigint NOT NULL,
    CONSTRAINT puesto_domicilio_requiere_coordenadas CHECK (((NOT ofrece_domicilio) OR ((latitud IS NOT NULL) AND (longitud IS NOT NULL)))),
    CONSTRAINT puesto_estado_valido CHECK (((estado)::text = ANY ((ARRAY['activo'::character varying, 'inactivo'::character varying, 'suspendido'::character varying])::text[])))
);


--
-- Name: catalog_puesto_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.catalog_puesto ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.catalog_puesto_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: catalog_puestocategoria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.catalog_puestocategoria (
    id bigint NOT NULL,
    id_categoria_id bigint NOT NULL,
    id_puesto_id bigint NOT NULL
);


--
-- Name: catalog_puestocategoria_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.catalog_puestocategoria ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.catalog_puestocategoria_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: django_admin_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.django_admin_log (
    id integer NOT NULL,
    action_time timestamp with time zone NOT NULL,
    object_id text,
    object_repr character varying(200) NOT NULL,
    action_flag smallint NOT NULL,
    change_message text NOT NULL,
    content_type_id integer,
    user_id bigint NOT NULL,
    CONSTRAINT django_admin_log_action_flag_check CHECK ((action_flag >= 0))
);


--
-- Name: django_admin_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.django_admin_log ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.django_admin_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: django_content_type; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.django_content_type (
    id integer NOT NULL,
    app_label character varying(100) NOT NULL,
    model character varying(100) NOT NULL
);


--
-- Name: django_content_type_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.django_content_type ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.django_content_type_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: django_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.django_migrations (
    id bigint NOT NULL,
    app character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    applied timestamp with time zone NOT NULL
);


--
-- Name: django_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.django_migrations ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.django_migrations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: django_session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.django_session (
    session_key character varying(40) NOT NULL,
    session_data text NOT NULL,
    expire_date timestamp with time zone NOT NULL
);


--
-- Name: notifications_notificacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications_notificacion (
    id bigint NOT NULL,
    tipo character varying(30) NOT NULL,
    titulo character varying(120) NOT NULL,
    mensaje text NOT NULL,
    leida boolean NOT NULL,
    fecha_creacion timestamp with time zone NOT NULL,
    fecha_lectura timestamp with time zone,
    id_pedido_id bigint,
    id_usuario_id bigint NOT NULL,
    CONSTRAINT notificacion_tipo_valido CHECK (((tipo)::text = ANY ((ARRAY['pedido_creado'::character varying, 'pedido_confirmado'::character varying, 'pedido_en_preparacion'::character varying, 'pedido_en_camino'::character varying, 'pedido_entregado'::character varying, 'pedido_cancelado'::character varying, 'pago_aprobado'::character varying, 'pago_rechazado'::character varying, 'verificacion'::character varying, 'general'::character varying])::text[])))
);


--
-- Name: notifications_notificacion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.notifications_notificacion ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.notifications_notificacion_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: orders_itempedido; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders_itempedido (
    id bigint NOT NULL,
    nombre_producto character varying(120) NOT NULL,
    unidad_medida character varying(15) NOT NULL,
    precio_unitario numeric(12,2) NOT NULL,
    cantidad integer NOT NULL,
    id_producto_id bigint NOT NULL,
    id_pedido_id bigint NOT NULL,
    CONSTRAINT itempedido_cantidad_positiva CHECK ((cantidad >= 1)),
    CONSTRAINT itempedido_precio_no_negativo CHECK ((precio_unitario >= (0)::numeric)),
    CONSTRAINT orders_itempedido_cantidad_check CHECK ((cantidad >= 0))
);


--
-- Name: orders_itempedido_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.orders_itempedido ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.orders_itempedido_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: orders_pedido; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders_pedido (
    id bigint NOT NULL,
    tipo_entrega character varying(15) NOT NULL,
    estado character varying(15) NOT NULL,
    direccion_entrega character varying(200) NOT NULL,
    referencia_entrega character varying(150) NOT NULL,
    notas text NOT NULL,
    subtotal numeric(12,2) NOT NULL,
    tarifa_domicilio numeric(12,2) NOT NULL,
    total numeric(12,2) NOT NULL,
    fecha_creacion timestamp with time zone NOT NULL,
    fecha_actualizacion timestamp with time zone NOT NULL,
    id_comprador_id bigint NOT NULL,
    id_puesto_id bigint NOT NULL,
    id_direccion_id bigint,
    latitud_entrega numeric(9,6),
    longitud_entrega numeric(9,6),
    descuento_cupon numeric(12,2) NOT NULL,
    id_cupon_id bigint,
    CONSTRAINT pedido_coordenadas_completas CHECK ((((latitud_entrega IS NULL) AND (longitud_entrega IS NULL)) OR ((latitud_entrega IS NOT NULL) AND (longitud_entrega IS NOT NULL)))),
    CONSTRAINT pedido_domicilio_requiere_direccion CHECK ((((tipo_entrega)::text = 'retiro'::text) OR (NOT ((direccion_entrega)::text = ''::text)))),
    CONSTRAINT pedido_estado_valido CHECK (((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'confirmado'::character varying, 'en_preparacion'::character varying, 'en_camino'::character varying, 'entregado'::character varying, 'cancelado'::character varying])::text[]))),
    CONSTRAINT pedido_tipo_entrega_valido CHECK (((tipo_entrega)::text = ANY ((ARRAY['retiro'::character varying, 'domicilio'::character varying])::text[]))),
    CONSTRAINT pedido_total_es_subtotal_mas_tarifa_menos_descuento CHECK ((total = ((subtotal + tarifa_domicilio) - descuento_cupon))),
    CONSTRAINT pedido_totales_no_negativos CHECK (((subtotal >= (0)::numeric) AND (tarifa_domicilio >= (0)::numeric) AND (descuento_cupon >= (0)::numeric) AND (total >= (0)::numeric)))
);


--
-- Name: orders_pedido_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.orders_pedido ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.orders_pedido_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: payments_pago; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments_pago (
    id bigint NOT NULL,
    metodo_pago character varying(20) NOT NULL,
    estado character varying(15) NOT NULL,
    subtotal_pedido numeric(12,2) NOT NULL,
    tarifa_domicilio_aplicada numeric(12,2) NOT NULL,
    comision_plataforma numeric(12,2) NOT NULL,
    total_cobrado numeric(12,2) NOT NULL,
    referencia_gateway character varying(120) NOT NULL,
    datos_sandbox jsonb NOT NULL,
    notas text NOT NULL,
    fecha_creacion timestamp with time zone NOT NULL,
    fecha_actualizacion timestamp with time zone NOT NULL,
    fecha_aprobacion timestamp with time zone,
    id_pedido_id bigint NOT NULL,
    fecha_reembolso timestamp with time zone,
    descuento_aplicado numeric(12,2) NOT NULL,
    CONSTRAINT pago_estado_valido CHECK (((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'procesando'::character varying, 'aprobado'::character varying, 'rechazado'::character varying, 'reembolsado'::character varying, 'anulado'::character varying])::text[]))),
    CONSTRAINT pago_metodo_valido CHECK (((metodo_pago)::text = ANY ((ARRAY['efectivo'::character varying, 'transferencia'::character varying, 'tarjeta'::character varying, 'nequi'::character varying, 'daviplata'::character varying, 'simulado'::character varying])::text[]))),
    CONSTRAINT pago_montos_no_negativos CHECK (((subtotal_pedido >= (0)::numeric) AND (tarifa_domicilio_aplicada >= (0)::numeric) AND (comision_plataforma >= (0)::numeric) AND (descuento_aplicado >= (0)::numeric) AND (total_cobrado >= (0)::numeric))),
    CONSTRAINT pago_total_coincide_con_subtotal_mas_domicilio CHECK ((total_cobrado = ((subtotal_pedido + tarifa_domicilio_aplicada) - descuento_aplicado)))
);


--
-- Name: payments_pago_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.payments_pago ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.payments_pago_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: promotions_cupon; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promotions_cupon (
    id bigint NOT NULL,
    codigo character varying(40) NOT NULL,
    tipo_descuento character varying(15) NOT NULL,
    valor numeric(10,2) NOT NULL,
    monto_minimo_pedido numeric(12,2) NOT NULL,
    tope_descuento numeric(10,2),
    usos_totales integer,
    usos_por_usuario integer,
    fecha_inicio timestamp with time zone,
    fecha_fin timestamp with time zone,
    activo boolean NOT NULL,
    fecha_creacion timestamp with time zone NOT NULL,
    id_puesto_id bigint,
    CONSTRAINT cupon_fechas_coherentes CHECK (((fecha_fin IS NULL) OR (fecha_inicio IS NULL) OR (fecha_inicio <= fecha_fin))),
    CONSTRAINT cupon_porcentaje_no_excede_100 CHECK ((((tipo_descuento)::text = 'monto'::text) OR (valor <= (100)::numeric))),
    CONSTRAINT cupon_tipo_valido CHECK (((tipo_descuento)::text = ANY ((ARRAY['porcentaje'::character varying, 'monto'::character varying])::text[]))),
    CONSTRAINT cupon_usos_por_usuario_positivos CHECK (((usos_por_usuario IS NULL) OR (usos_por_usuario > 0))),
    CONSTRAINT cupon_usos_totales_positivos CHECK (((usos_totales IS NULL) OR (usos_totales > 0))),
    CONSTRAINT cupon_valor_positivo CHECK ((valor > (0)::numeric)),
    CONSTRAINT promotions_cupon_usos_por_usuario_check CHECK ((usos_por_usuario >= 0)),
    CONSTRAINT promotions_cupon_usos_totales_check CHECK ((usos_totales >= 0))
);


--
-- Name: promotions_cupon_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.promotions_cupon ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.promotions_cupon_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: promotions_usocupon; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promotions_usocupon (
    id bigint NOT NULL,
    descuento_aplicado numeric(12,2) NOT NULL,
    fecha_uso timestamp with time zone NOT NULL,
    id_cupon_id bigint NOT NULL,
    id_pedido_id bigint NOT NULL,
    id_usuario_id bigint NOT NULL
);


--
-- Name: promotions_usocupon_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.promotions_usocupon ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.promotions_usocupon_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: reviews_resena; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews_resena (
    id bigint NOT NULL,
    calificacion smallint NOT NULL,
    comentario text NOT NULL,
    respuesta text NOT NULL,
    fecha_respuesta timestamp with time zone,
    visible boolean NOT NULL,
    fecha_creacion timestamp with time zone NOT NULL,
    fecha_actualizacion timestamp with time zone NOT NULL,
    id_pedido_id bigint,
    id_puesto_id bigint NOT NULL,
    id_usuario_id bigint NOT NULL,
    CONSTRAINT resena_calificacion_valida CHECK (((calificacion >= 1) AND (calificacion <= 5))),
    CONSTRAINT reviews_resena_calificacion_check CHECK ((calificacion >= 0))
);


--
-- Name: reviews_resena_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.reviews_resena ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.reviews_resena_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: token_blacklist_blacklistedtoken; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.token_blacklist_blacklistedtoken (
    id bigint NOT NULL,
    blacklisted_at timestamp with time zone NOT NULL,
    token_id bigint NOT NULL
);


--
-- Name: token_blacklist_blacklistedtoken_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.token_blacklist_blacklistedtoken ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.token_blacklist_blacklistedtoken_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: token_blacklist_outstandingtoken; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.token_blacklist_outstandingtoken (
    id bigint NOT NULL,
    token text NOT NULL,
    created_at timestamp with time zone,
    expires_at timestamp with time zone NOT NULL,
    user_id bigint,
    jti character varying(255) NOT NULL
);


--
-- Name: token_blacklist_outstandingtoken_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.token_blacklist_outstandingtoken ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.token_blacklist_outstandingtoken_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: messages; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    binary_payload bytea,
    skip_broadcast boolean DEFAULT false NOT NULL
)
PARTITION BY RANGE (inserted_at);


--
-- Name: schema_migrations; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone DEFAULT now()
);


--
-- Name: subscription; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.subscription (
    id bigint NOT NULL,
    subscription_id uuid NOT NULL,
    entity regclass NOT NULL,
    filters realtime.user_defined_filter[] DEFAULT '{}'::realtime.user_defined_filter[] NOT NULL,
    claims jsonb NOT NULL,
    claims_role regrole GENERATED ALWAYS AS (realtime.to_regrole((claims ->> 'role'::text))) STORED NOT NULL,
    created_at timestamp without time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    action_filter text DEFAULT '*'::text,
    selected_columns text[],
    CONSTRAINT subscription_action_filter_check CHECK ((action_filter = ANY (ARRAY['*'::text, 'INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: subscription_id_seq; Type: SEQUENCE; Schema: realtime; Owner: -
--

ALTER TABLE realtime.subscription ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME realtime.subscription_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: buckets; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    owner_id text,
    type storage.buckettype DEFAULT 'STANDARD'::storage.buckettype NOT NULL,
    versioning_status text DEFAULT 'DISABLED'::text NOT NULL,
    lifecycle_configuration jsonb,
    lifecycle_configuration_generation uuid,
    CONSTRAINT buckets_lifecycle_configuration_pair_check CHECK (((lifecycle_configuration IS NULL) = (lifecycle_configuration_generation IS NULL))),
    CONSTRAINT buckets_lifecycle_configuration_shape_check CHECK (((lifecycle_configuration IS NULL) OR ((jsonb_typeof(lifecycle_configuration) = 'object'::text) AND (lifecycle_configuration ? 'rules'::text) AND
CASE
    WHEN (jsonb_typeof((lifecycle_configuration -> 'rules'::text)) = 'array'::text) THEN ((jsonb_array_length((lifecycle_configuration -> 'rules'::text)) >= 1) AND (jsonb_array_length((lifecycle_configuration -> 'rules'::text)) <= 1000))
    ELSE false
END))),
    CONSTRAINT buckets_lifecycle_configuration_standard_only_check CHECK (((type = 'STANDARD'::storage.buckettype) OR ((lifecycle_configuration IS NULL) AND (lifecycle_configuration_generation IS NULL)))),
    CONSTRAINT buckets_versioning_dark_check CHECK ((versioning_status = 'DISABLED'::text)),
    CONSTRAINT buckets_versioning_standard_only_check CHECK (((type = 'STANDARD'::storage.buckettype) OR (versioning_status = 'DISABLED'::text))),
    CONSTRAINT buckets_versioning_status_check CHECK ((versioning_status = ANY (ARRAY['DISABLED'::text, 'ENABLED'::text, 'SUSPENDED'::text])))
);


--
-- Name: COLUMN buckets.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: buckets_analytics; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets_analytics (
    name text NOT NULL,
    type storage.buckettype DEFAULT 'ANALYTICS'::storage.buckettype NOT NULL,
    format text DEFAULT 'ICEBERG'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: buckets_vectors; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets_vectors (
    id text NOT NULL,
    type storage.buckettype DEFAULT 'VECTOR'::storage.buckettype NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: migrations; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: objects; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/'::text)) STORED,
    version text,
    owner_id text,
    user_metadata jsonb,
    archived_at timestamp with time zone,
    is_delete_marker boolean DEFAULT false NOT NULL,
    is_versioned boolean DEFAULT false NOT NULL
);


--
-- Name: COLUMN objects.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads (
    id text NOT NULL,
    in_progress_size bigint DEFAULT 0 NOT NULL,
    upload_signature text NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    version text NOT NULL,
    owner_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_metadata jsonb,
    metadata jsonb
);


--
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    upload_id text NOT NULL,
    size bigint DEFAULT 0 NOT NULL,
    part_number integer NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    etag text NOT NULL,
    owner_id text,
    version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vector_indexes; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.vector_indexes (
    id text DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    bucket_id text NOT NULL,
    data_type text NOT NULL,
    dimension integer NOT NULL,
    distance_metric text NOT NULL,
    metadata_configuration jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass);


--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.audit_log_entries (instance_id, id, payload, created_at, ip_address) FROM stdin;
\.


--
-- Data for Name: custom_oauth_providers; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.custom_oauth_providers (id, provider_type, identifier, name, client_id, client_secret, acceptable_client_ids, scopes, pkce_enabled, attribute_mapping, authorization_params, enabled, email_optional, issuer, discovery_url, skip_nonce_check, cached_discovery, discovery_cached_at, authorization_url, token_url, userinfo_url, jwks_uri, created_at, updated_at, custom_claims_allowlist) FROM stdin;
\.


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.flow_state (id, user_id, auth_code, code_challenge_method, code_challenge, provider_type, provider_access_token, provider_refresh_token, created_at, updated_at, authentication_method, auth_code_issued_at, invite_token, referrer, oauth_client_state_id, linking_target_id, email_optional) FROM stdin;
\.


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id) FROM stdin;
\.


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.instances (id, uuid, raw_base_config, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.mfa_amr_claims (session_id, created_at, updated_at, authentication_method, id) FROM stdin;
\.


--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.mfa_challenges (id, factor_id, created_at, verified_at, ip_address, otp_code, web_authn_session_data) FROM stdin;
\.


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at, secret, phone, last_challenged_at, web_authn_credential, web_authn_aaguid, last_webauthn_challenge_data) FROM stdin;
\.


--
-- Data for Name: mfa_recovery_code_sets; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.mfa_recovery_code_sets (id, user_id, mfa_factor_id, failed_verification_count, verification_locked_until, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: mfa_recovery_codes; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.mfa_recovery_codes (id, mfa_recovery_code_set_id, code_hash, consumed_at, created_at) FROM stdin;
\.


--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.oauth_authorizations (id, authorization_id, client_id, user_id, redirect_uri, scope, state, resource, code_challenge, code_challenge_method, response_type, status, authorization_code, created_at, expires_at, approved_at, nonce) FROM stdin;
\.


--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.oauth_client_states (id, provider_type, code_verifier, created_at) FROM stdin;
\.


--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.oauth_clients (id, client_secret_hash, registration_type, redirect_uris, grant_types, client_name, client_uri, logo_uri, created_at, updated_at, deleted_at, client_type, token_endpoint_auth_method) FROM stdin;
\.


--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.oauth_consents (id, user_id, client_id, scopes, granted_at, revoked_at) FROM stdin;
\.


--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.one_time_tokens (id, user_id, token_type, token_hash, relates_to, created_at, updated_at, expires_at) FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.refresh_tokens (instance_id, id, token, user_id, revoked, created_at, updated_at, parent, session_id) FROM stdin;
\.


--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.saml_providers (id, sso_provider_id, entity_id, metadata_xml, metadata_url, attribute_mapping, created_at, updated_at, name_id_format) FROM stdin;
\.


--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.saml_relay_states (id, sso_provider_id, request_id, for_email, redirect_to, created_at, updated_at, flow_state_id) FROM stdin;
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.schema_migrations (version) FROM stdin;
20171026211738
20171026211808
20171026211834
20180103212743
20180108183307
20180119214651
20180125194653
00
20210710035447
20210722035447
20210730183235
20210909172000
20210927181326
20211122151130
20211124214934
20211202183645
20220114185221
20220114185340
20220224000811
20220323170000
20220429102000
20220531120530
20220614074223
20220811173540
20221003041349
20221003041400
20221011041400
20221020193600
20221021073300
20221021082433
20221027105023
20221114143122
20221114143410
20221125140132
20221208132122
20221215195500
20221215195800
20221215195900
20230116124310
20230116124412
20230131181311
20230322519590
20230402418590
20230411005111
20230508135423
20230523124323
20230818113222
20230914180801
20231027141322
20231114161723
20231117164230
20240115144230
20240214120130
20240306115329
20240314092811
20240427152123
20240612123726
20240729123726
20240802193726
20240806073726
20241009103726
20250717082212
20250731150234
20250804100000
20250901200500
20250903112500
20250904133000
20250925093508
20251007112900
20251104100000
20251111201300
20251201000000
20260115000000
20260121000000
20260219120000
20260302000000
20260625000000
20260821000000
20260821010000
20260824000000
20260824000001
20260831180000
\.


--
-- Data for Name: scim_tokens; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.scim_tokens (id, sso_provider_id, token_hash, prefix, created_at, expires_at, revoked_at, last_used_at) FROM stdin;
\.


--
-- Data for Name: scim_users; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.scim_users (id, sso_provider_id, user_id, resource, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.sessions (id, user_id, created_at, updated_at, factor_id, aal, not_after, refreshed_at, user_agent, ip, tag, oauth_client_id, refresh_token_hmac_key, refresh_token_counter, scopes) FROM stdin;
\.


--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.sso_domains (id, sso_provider_id, domain, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.sso_providers (id, resource_id, created_at, updated_at, disabled) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, email_change_token_new, email_change, email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous) FROM stdin;
\.


--
-- Data for Name: webauthn_challenges; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.webauthn_challenges (id, user_id, challenge_type, session_data, created_at, expires_at) FROM stdin;
\.


--
-- Data for Name: webauthn_credentials; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.webauthn_credentials (id, user_id, credential_id, public_key, attestation_type, aaguid, sign_count, transports, backup_eligible, backed_up, friendly_name, created_at, updated_at, last_used_at) FROM stdin;
\.


--
-- Data for Name: accounts_usuario; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.accounts_usuario (id, password, last_login, nombre, correo, celular, rol, estado, fecha_registro, is_staff, is_superuser) FROM stdin;
29	pbkdf2_sha256$870000$oWdztXVhi4SoSDFxduTvgC$oNa+bYk+/Ygs4NgybHeYMp6Wv8e8EoSFZWan3F8PYig=	\N	Jorge Luis Guerra	jorge@riomarket.test	3000000018	comprador	activo	2026-10-15 00:35:31.021627+00	f	f
30	pbkdf2_sha256$870000$muhu73tJSFrcwSHpuOMgyv$NQTFNA/y+iYOOTxan+b1iVcnIK+DANoWZ9L5sH/ok4k=	\N	Sara Milena Redondo	sara@riomarket.test	3000000019	comprador	activo	2026-10-15 00:35:32.976587+00	f	f
16	pbkdf2_sha256$870000$nEMPbrD5rkTeWWXtv8HJ4y$guf6+CqSgE0FEbEowTDSzH3jKq4Hf+d/uMhd2peSRl8=	\N	Ada Luz Epieyu	admin@riomarket.test	3000000001	administrador	activo	2026-10-15 00:35:02.001027+00	t	t
17	pbkdf2_sha256$870000$JvW9widwjvmbnmuUNmSE18$kdHeVYSVlBZUBIWOiiSjGWKrB545rqzLXAK870BHtVw=	\N	Carmen Sofía Iguarán	carmen@riomarket.test	3000000002	vendedor	activo	2026-10-15 00:35:04.072189+00	f	f
18	pbkdf2_sha256$870000$n8d4DLtsvEhqz3pcYPM9vd$xfWjfjZFebdkvfu7c5gUuZMsYzDFxHoWHNrfL8IfcRU=	\N	Diego Andrés Rivera	diego@riomarket.test	3000000003	vendedor	activo	2026-10-15 00:35:06.776109+00	f	f
19	pbkdf2_sha256$870000$TeT3yv5Ae3A0h7sJ4E1cl7$SF5oFD8PQZS7pJrpfuthy5upYcsgKLhTg11hR8OxJZk=	\N	Rosa Elena Pushaina	rosa@riomarket.test	3000000005	vendedor	activo	2026-10-15 00:35:09.38434+00	f	f
20	pbkdf2_sha256$870000$M7pRcStCM0Sypolis8ke7d$vmasS7zeA9HuMgKYXPZ8S3Pjlc9DY8aVCknEJ/74VtE=	\N	José Gregorio Uriana	jose@riomarket.test	3000000006	vendedor	activo	2026-10-15 00:35:12.15663+00	f	f
21	pbkdf2_sha256$870000$x6fm1RjRHPRJGBfKtDqAwe$vMoYR3gYiNjOVGae/Q7hE9YdYx5q1PS0SDXDIxRW0P0=	\N	Luis Fernando Pimienta	luis@riomarket.test	3000000010	comprador	activo	2026-10-15 00:35:14.823448+00	f	f
22	pbkdf2_sha256$870000$dlqLGP3D64rKW0NSivk3TA$nh93DiEYjlCd0/FCQUjmZhISYudr545GZ2AIQi9GHDU=	\N	Ana María Freyle	ana@riomarket.test	3000000011	comprador	activo	2026-10-15 00:35:16.795976+00	f	f
23	pbkdf2_sha256$870000$IoSBTJW41TL0jglOagWpG2$IP74729V6ur2xEnuKZwAEnMa+l6PkWXNOVI8Qc/Mofw=	\N	Kevin Alberto Mejía	kevin@riomarket.test	3000000012	comprador	activo	2026-10-15 00:35:18.897405+00	f	f
24	pbkdf2_sha256$870000$0UdVO0EqKJHOu4gR8ZWa6c$ox2mKVft/imz0DlL21VVeugcXki0bRILwwUdPeUu3GE=	\N	Laura Vanessa Daza	laura@riomarket.test	3000000013	comprador	activo	2026-10-15 00:35:20.85138+00	f	f
25	pbkdf2_sha256$870000$2VsBZgdd7E4a7JVfutJySG$YLynydH0/za17yUG9J5vhuSbTQbT0YZPT9N6Asuj5R4=	\N	Mario Enrique Barros	mario@riomarket.test	3000000014	comprador	activo	2026-10-15 00:35:23.102212+00	f	f
26	pbkdf2_sha256$870000$Z3wIWjNBh0BhwuSnfNy3tu$5vLxwet9D3jAsKO0eqqkYZl9iRjwH/YWB5WtdLm32jc=	\N	Yuliana Paola Ipuana	yuli@riomarket.test	3000000015	comprador	activo	2026-10-15 00:35:25.04643+00	f	f
27	pbkdf2_sha256$870000$QfOSzsbDdsUUnuRvhRhKe6$TCIDwFGcN9yfwHv6Az1YYyT3J1MDlOqiIHKXazDrcbg=	\N	Andrés Felipe Cotes	andres@riomarket.test	3000000016	comprador	activo	2026-10-15 00:35:27.131252+00	f	f
28	pbkdf2_sha256$870000$la9Gqind7Tt9p4gHeJz2NV$4O2U+zvmQlD5Z/wLfuU1mnTACRDxAyepYmBsb7hMVfo=	\N	Diana Carolina Rojas	diana@riomarket.test	3000000017	comprador	activo	2026-10-15 00:35:29.065699+00	f	f
\.


--
-- Data for Name: accounts_usuario_groups; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.accounts_usuario_groups (id, usuario_id, group_id) FROM stdin;
\.


--
-- Data for Name: accounts_usuario_user_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.accounts_usuario_user_permissions (id, usuario_id, permission_id) FROM stdin;
\.


--
-- Data for Name: accounts_vendedor; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.accounts_vendedor (id, numero_cedula, cedula_huella, foto_cedula, estado_verificacion, motivo_rechazo, fecha_solicitud, fecha_revision, id_revisor_id, id_usuario_id) FROM stdin;
5	\N	\N		aprobado		2026-10-15 00:35:06.085723+00	\N	\N	17
6	\N	\N		aprobado		2026-10-15 00:35:08.695908+00	\N	\N	18
7	\N	\N		aprobado		2026-10-15 00:35:11.486747+00	\N	\N	19
8	\N	\N		aprobado		2026-10-15 00:35:14.122323+00	\N	\N	20
\.


--
-- Data for Name: addresses_direccion; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.addresses_direccion (id, alias, direccion, referencia, latitud, longitud, es_predeterminada, activa, fecha_creacion, fecha_actualizacion, id_usuario_id) FROM stdin;
11	Casa	Calle 15 #7-42, Barrio Centro	Frente a la plaza	11.544440	-72.907490	t	t	2026-10-15 00:36:28.061514+00	2026-10-15 00:36:28.061514+00	21
12	Casa	Carrera 9 #14-08, Barrio El Dividivi	Portón azul	11.544440	-72.907490	t	t	2026-10-15 00:36:29.662978+00	2026-10-15 00:36:29.662978+00	22
13	Trabajo	Calle 9 #5-19, Barrio Camino Nuevo	Al lado de la panadería	11.544440	-72.907490	t	t	2026-10-15 00:36:31.263463+00	2026-10-15 00:36:31.263463+00	23
14	Casa	Carrera 12 #20-33, Barrio Bella Vista	Casa de dos pisos	11.544440	-72.907490	t	t	2026-10-15 00:36:32.836609+00	2026-10-15 00:36:32.836609+00	24
15	Casa	Calle 4 #11-27, Barrio Los Almendros	Frente al parque	11.544440	-72.907490	t	t	2026-10-15 00:36:34.415605+00	2026-10-15 00:36:34.415605+00	25
16	Trabajo	Carrera 5 #18-51, Barrio Nueva Esperanza	Edificio amarillo	11.544440	-72.907490	t	t	2026-10-15 00:36:36.036589+00	2026-10-15 00:36:36.036589+00	26
17	Casa	Calle 22 #6-14, Barrio El Progreso	Reja verde	11.544440	-72.907490	t	t	2026-10-15 00:36:37.609737+00	2026-10-15 00:36:37.609737+00	27
18	Casa	Carrera 3 #13-60, Barrio San Martín	Diagonal al colegio	11.544440	-72.907490	t	t	2026-10-15 00:36:39.208263+00	2026-10-15 00:36:39.208263+00	28
19	Trabajo	Calle 8 #16-22, Barrio Villa Fátima	Local esquinero	11.544440	-72.907490	t	t	2026-10-15 00:36:40.831771+00	2026-10-15 00:36:40.831771+00	29
20	Casa	Carrera 10 #25-07, Barrio 31 de Octubre	Casa esquinera	11.544440	-72.907490	t	t	2026-10-15 00:36:42.402953+00	2026-10-15 00:36:42.402953+00	30
\.


--
-- Data for Name: audit_registroauditoria; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_registroauditoria (id, accion, entidad, id_entidad, detalle, direccion_ip, fecha_creacion, id_usuario_id) FROM stdin;
110	crear	cupon	6	{"codigo": "BIENVENIDA2026"}	\N	2026-10-15 00:36:44.369622+00	16
111	crear	cupon	7	{"codigo": "MERCADO5000"}	\N	2026-10-15 00:36:46.112675+00	16
112	crear	cupon	8	{"codigo": "FRESCO10"}	\N	2026-10-15 00:36:47.900645+00	16
113	crear	cupon	9	{"codigo": "TEJIDOS5000"}	\N	2026-10-15 00:36:49.839001+00	16
114	crear	cupon	10	{"codigo": "PALENQUE2000"}	\N	2026-10-15 00:36:51.762707+00	16
115	crear	pedido	16	{"cupon": null, "total": "7000.00"}	\N	2026-10-15 00:36:55.496841+00	21
116	crear	pago	16	{"estado": "pendiente", "pedido": 16}	\N	2026-10-15 00:36:57.429333+00	21
117	aprobar	pago	16	{"estado": "aprobado", "pedido": 16}	\N	2026-10-15 00:36:59.56299+00	21
118	transicion	pedido	16	{"a": "confirmado", "de": "pendiente"}	\N	2026-10-15 00:37:01.153706+00	17
119	transicion	pedido	16	{"a": "en_preparacion", "de": "confirmado"}	\N	2026-10-15 00:37:02.533497+00	17
120	transicion	pedido	16	{"a": "en_camino", "de": "en_preparacion"}	\N	2026-10-15 00:37:03.972856+00	17
121	transicion	pedido	16	{"a": "entregado", "de": "en_camino"}	\N	2026-10-15 00:37:05.389757+00	17
122	crear	pedido	17	{"cupon": null, "total": "45000.00"}	\N	2026-10-15 00:37:09.252799+00	22
123	crear	pago	17	{"estado": "pendiente", "pedido": 17}	\N	2026-10-15 00:37:11.160881+00	22
124	aprobar	pago	17	{"estado": "aprobado", "pedido": 17}	\N	2026-10-15 00:37:13.236919+00	22
125	transicion	pedido	17	{"a": "confirmado", "de": "pendiente"}	\N	2026-10-15 00:37:14.84229+00	18
126	transicion	pedido	17	{"a": "en_preparacion", "de": "confirmado"}	\N	2026-10-15 00:37:16.238686+00	18
127	transicion	pedido	17	{"a": "en_camino", "de": "en_preparacion"}	\N	2026-10-15 00:37:17.60968+00	18
128	transicion	pedido	17	{"a": "entregado", "de": "en_camino"}	\N	2026-10-15 00:37:19.017802+00	18
129	usar_cupon	cupon	8	{"pedido": 18, "descuento": "1700.00"}	\N	2026-10-15 00:37:23.254834+00	23
130	crear	pedido	18	{"cupon": 8, "total": "15300.00"}	\N	2026-10-15 00:37:24.298706+00	23
131	crear	pago	18	{"estado": "pendiente", "pedido": 18}	\N	2026-10-15 00:37:26.234128+00	23
132	aprobar	pago	18	{"estado": "aprobado", "pedido": 18}	\N	2026-10-15 00:37:28.369736+00	23
133	transicion	pedido	18	{"a": "confirmado", "de": "pendiente"}	\N	2026-10-15 00:37:29.952642+00	19
134	transicion	pedido	18	{"a": "en_preparacion", "de": "confirmado"}	\N	2026-10-15 00:37:31.366615+00	19
135	transicion	pedido	18	{"a": "en_camino", "de": "en_preparacion"}	\N	2026-10-15 00:37:32.820619+00	19
136	transicion	pedido	18	{"a": "entregado", "de": "en_camino"}	\N	2026-10-15 00:37:34.228736+00	19
137	crear	pedido	19	{"cupon": null, "total": "30000.00"}	\N	2026-10-15 00:37:38.148412+00	24
138	crear	pago	19	{"estado": "pendiente", "pedido": 19}	\N	2026-10-15 00:37:40.09512+00	24
139	aprobar	pago	19	{"estado": "aprobado", "pedido": 19}	\N	2026-10-15 00:37:42.193619+00	24
140	transicion	pedido	19	{"a": "confirmado", "de": "pendiente"}	\N	2026-10-15 00:37:43.784349+00	20
141	transicion	pedido	19	{"a": "en_preparacion", "de": "confirmado"}	\N	2026-10-15 00:37:45.165112+00	20
142	transicion	pedido	19	{"a": "en_camino", "de": "en_preparacion"}	\N	2026-10-15 00:37:46.551742+00	20
143	transicion	pedido	19	{"a": "entregado", "de": "en_camino"}	\N	2026-10-15 00:37:47.961805+00	20
144	crear	pedido	20	{"cupon": null, "total": "15000.00"}	\N	2026-10-15 00:37:51.851204+00	25
145	crear	pago	20	{"estado": "pendiente", "pedido": 20}	\N	2026-10-15 00:37:53.800296+00	25
146	aprobar	pago	20	{"estado": "aprobado", "pedido": 20}	\N	2026-10-15 00:37:55.931024+00	17
147	transicion	pedido	20	{"a": "confirmado", "de": "pendiente"}	\N	2026-10-15 00:37:57.525644+00	17
148	transicion	pedido	20	{"a": "en_preparacion", "de": "confirmado"}	\N	2026-10-15 00:37:58.961101+00	17
149	transicion	pedido	20	{"a": "en_camino", "de": "en_preparacion"}	\N	2026-10-15 00:38:00.334066+00	17
150	transicion	pedido	20	{"a": "entregado", "de": "en_camino"}	\N	2026-10-15 00:38:01.742172+00	17
151	crear	pedido	21	{"cupon": null, "total": "40000.00"}	\N	2026-10-15 00:38:05.616928+00	26
152	crear	pago	21	{"estado": "pendiente", "pedido": 21}	\N	2026-10-15 00:38:07.575791+00	26
153	aprobar	pago	21	{"estado": "aprobado", "pedido": 21}	\N	2026-10-15 00:38:09.715296+00	26
154	transicion	pedido	21	{"a": "confirmado", "de": "pendiente"}	\N	2026-10-15 00:38:11.332379+00	18
155	transicion	pedido	21	{"a": "en_preparacion", "de": "confirmado"}	\N	2026-10-15 00:38:12.780527+00	18
156	transicion	pedido	21	{"a": "en_camino", "de": "en_preparacion"}	\N	2026-10-15 00:38:14.180828+00	18
157	transicion	pedido	21	{"a": "entregado", "de": "en_camino"}	\N	2026-10-15 00:38:15.547935+00	18
158	crear	pedido	22	{"cupon": null, "total": "25000.00"}	\N	2026-10-15 00:38:19.643378+00	27
159	crear	pago	22	{"estado": "pendiente", "pedido": 22}	\N	2026-10-15 00:38:21.556333+00	27
160	aprobar	pago	22	{"estado": "aprobado", "pedido": 22}	\N	2026-10-15 00:38:23.687068+00	27
161	transicion	pedido	22	{"a": "confirmado", "de": "pendiente"}	\N	2026-10-15 00:38:25.288516+00	17
162	transicion	pedido	22	{"a": "en_preparacion", "de": "confirmado"}	\N	2026-10-15 00:38:26.688823+00	17
163	transicion	pedido	22	{"a": "en_camino", "de": "en_preparacion"}	\N	2026-10-15 00:38:28.073495+00	17
164	transicion	pedido	22	{"a": "entregado", "de": "en_camino"}	\N	2026-10-15 00:38:29.493325+00	17
165	usar_cupon	cupon	9	{"pedido": 23, "descuento": "5000.00"}	\N	2026-10-15 00:38:33.500882+00	28
166	crear	pedido	23	{"cupon": 9, "total": "55000.00"}	\N	2026-10-15 00:38:34.576984+00	28
167	crear	pago	23	{"estado": "pendiente", "pedido": 23}	\N	2026-10-15 00:38:36.516296+00	28
168	aprobar	pago	23	{"estado": "aprobado", "pedido": 23}	\N	2026-10-15 00:38:38.637256+00	28
169	transicion	pedido	23	{"a": "confirmado", "de": "pendiente"}	\N	2026-10-15 00:38:40.213902+00	18
170	transicion	pedido	23	{"a": "en_preparacion", "de": "confirmado"}	\N	2026-10-15 00:38:41.609317+00	18
171	transicion	pedido	23	{"a": "en_camino", "de": "en_preparacion"}	\N	2026-10-15 00:38:43.016455+00	18
172	transicion	pedido	23	{"a": "entregado", "de": "en_camino"}	\N	2026-10-15 00:38:44.403082+00	18
173	crear	pedido	24	{"cupon": null, "total": "12000.00"}	\N	2026-10-15 00:38:48.369626+00	29
174	crear	pago	24	{"estado": "pendiente", "pedido": 24}	\N	2026-10-15 00:38:50.289433+00	29
175	aprobar	pago	24	{"estado": "aprobado", "pedido": 24}	\N	2026-10-15 00:38:52.42796+00	29
176	transicion	pedido	24	{"a": "confirmado", "de": "pendiente"}	\N	2026-10-15 00:38:54.006963+00	19
177	transicion	pedido	24	{"a": "en_preparacion", "de": "confirmado"}	\N	2026-10-15 00:38:55.423862+00	19
178	transicion	pedido	24	{"a": "en_camino", "de": "en_preparacion"}	\N	2026-10-15 00:38:56.881775+00	19
179	transicion	pedido	24	{"a": "entregado", "de": "en_camino"}	\N	2026-10-15 00:38:58.278177+00	19
180	crear	pedido	25	{"cupon": null, "total": "32000.00"}	\N	2026-10-15 00:39:02.271088+00	30
181	crear	pago	25	{"estado": "pendiente", "pedido": 25}	\N	2026-10-15 00:39:04.223104+00	30
182	aprobar	pago	25	{"estado": "aprobado", "pedido": 25}	\N	2026-10-15 00:39:06.372383+00	30
183	transicion	pedido	25	{"a": "confirmado", "de": "pendiente"}	\N	2026-10-15 00:39:07.954311+00	20
184	transicion	pedido	25	{"a": "en_preparacion", "de": "confirmado"}	\N	2026-10-15 00:39:09.335089+00	20
185	transicion	pedido	25	{"a": "en_camino", "de": "en_preparacion"}	\N	2026-10-15 00:39:10.732452+00	20
186	transicion	pedido	25	{"a": "entregado", "de": "en_camino"}	\N	2026-10-15 00:39:12.10835+00	20
187	crear	pedido	26	{"cupon": null, "total": "60000.00"}	\N	2026-10-15 00:39:15.935248+00	21
188	crear	pago	26	{"estado": "pendiente", "pedido": 26}	\N	2026-10-15 00:39:17.855044+00	21
189	aprobar	pago	26	{"estado": "aprobado", "pedido": 26}	\N	2026-10-15 00:39:19.958428+00	21
190	transicion	pedido	26	{"a": "confirmado", "de": "pendiente"}	\N	2026-10-15 00:39:21.54426+00	18
191	transicion	pedido	26	{"a": "en_preparacion", "de": "confirmado"}	\N	2026-10-15 00:39:22.932851+00	18
192	transicion	pedido	26	{"a": "en_camino", "de": "en_preparacion"}	\N	2026-10-15 00:39:24.35366+00	18
193	transicion	pedido	26	{"a": "entregado", "de": "en_camino"}	\N	2026-10-15 00:39:25.740284+00	18
194	crear	pedido	27	{"cupon": null, "total": "36000.00"}	\N	2026-10-15 00:39:29.772259+00	22
195	crear	pago	27	{"estado": "pendiente", "pedido": 27}	\N	2026-10-15 00:39:31.730133+00	22
196	aprobar	pago	27	{"estado": "aprobado", "pedido": 27}	\N	2026-10-15 00:39:33.875507+00	22
197	transicion	pedido	27	{"a": "confirmado", "de": "pendiente"}	\N	2026-10-15 00:39:35.439857+00	18
198	transicion	pedido	27	{"a": "en_preparacion", "de": "confirmado"}	\N	2026-10-15 00:39:36.825513+00	18
199	transicion	pedido	27	{"a": "en_camino", "de": "en_preparacion"}	\N	2026-10-15 00:39:38.21507+00	18
200	transicion	pedido	27	{"a": "entregado", "de": "en_camino"}	\N	2026-10-15 00:39:39.60332+00	18
201	crear	pedido	28	{"cupon": null, "total": "16000.00"}	\N	2026-10-15 00:39:43.469285+00	23
202	crear	pago	28	{"estado": "pendiente", "pedido": 28}	\N	2026-10-15 00:39:45.435955+00	23
203	aprobar	pago	28	{"estado": "aprobado", "pedido": 28}	\N	2026-10-15 00:39:47.615509+00	17
204	transicion	pedido	28	{"a": "confirmado", "de": "pendiente"}	\N	2026-10-15 00:39:49.228683+00	17
205	transicion	pedido	28	{"a": "en_preparacion", "de": "confirmado"}	\N	2026-10-15 00:39:50.645583+00	17
206	transicion	pedido	28	{"a": "en_camino", "de": "en_preparacion"}	\N	2026-10-15 00:39:52.047839+00	17
207	transicion	pedido	28	{"a": "entregado", "de": "en_camino"}	\N	2026-10-15 00:39:53.435449+00	17
208	crear	pedido	29	{"cupon": null, "total": "70000.00"}	\N	2026-10-15 00:39:57.247703+00	24
209	crear	pago	29	{"estado": "pendiente", "pedido": 29}	\N	2026-10-15 00:39:59.227071+00	24
210	aprobar	pago	29	{"estado": "aprobado", "pedido": 29}	\N	2026-10-15 00:40:01.365607+00	24
211	transicion	pedido	29	{"a": "confirmado", "de": "pendiente"}	\N	2026-10-15 00:40:02.928006+00	18
212	transicion	pedido	29	{"a": "en_preparacion", "de": "confirmado"}	\N	2026-10-15 00:40:04.350766+00	18
213	transicion	pedido	29	{"a": "en_camino", "de": "en_preparacion"}	\N	2026-10-15 00:40:05.770596+00	18
214	transicion	pedido	29	{"a": "entregado", "de": "en_camino"}	\N	2026-10-15 00:40:07.15918+00	18
215	crear	pedido	30	{"cupon": null, "total": "16000.00"}	\N	2026-10-15 00:40:11.06713+00	25
216	crear	pago	30	{"estado": "pendiente", "pedido": 30}	\N	2026-10-15 00:40:12.999622+00	25
217	aprobar	pago	30	{"estado": "aprobado", "pedido": 30}	\N	2026-10-15 00:40:15.103004+00	25
218	transicion	pedido	30	{"a": "confirmado", "de": "pendiente"}	\N	2026-10-15 00:40:16.685913+00	20
219	transicion	pedido	30	{"a": "en_preparacion", "de": "confirmado"}	\N	2026-10-15 00:40:18.08621+00	20
220	transicion	pedido	30	{"a": "en_camino", "de": "en_preparacion"}	\N	2026-10-15 00:40:19.451355+00	20
221	transicion	pedido	30	{"a": "entregado", "de": "en_camino"}	\N	2026-10-15 00:40:20.827245+00	20
222	usar_cupon	cupon	10	{"pedido": 31, "descuento": "2000.00"}	\N	2026-10-15 00:40:24.726408+00	26
223	crear	pedido	31	{"cupon": 10, "total": "8000.00"}	\N	2026-10-15 00:40:25.77615+00	26
224	crear	pago	31	{"estado": "pendiente", "pedido": 31}	\N	2026-10-15 00:40:27.66079+00	26
225	aprobar	pago	31	{"estado": "aprobado", "pedido": 31}	\N	2026-10-15 00:40:29.723164+00	26
226	transicion	pedido	31	{"a": "confirmado", "de": "pendiente"}	\N	2026-10-15 00:40:31.282629+00	17
227	transicion	pedido	31	{"a": "en_preparacion", "de": "confirmado"}	\N	2026-10-15 00:40:32.675117+00	17
228	transicion	pedido	31	{"a": "en_camino", "de": "en_preparacion"}	\N	2026-10-15 00:40:34.072497+00	17
229	transicion	pedido	31	{"a": "entregado", "de": "en_camino"}	\N	2026-10-15 00:40:35.504041+00	17
230	crear	pedido	32	{"cupon": null, "total": "8000.00"}	\N	2026-10-15 00:40:39.377818+00	27
231	crear	pago	32	{"estado": "pendiente", "pedido": 32}	\N	2026-10-15 00:40:41.305978+00	27
232	aprobar	pago	32	{"estado": "aprobado", "pedido": 32}	\N	2026-10-15 00:40:43.413261+00	27
233	transicion	pedido	32	{"a": "cancelado", "de": "pendiente"}	\N	2026-10-15 00:40:48.184438+00	27
234	crear	pedido	33	{"cupon": null, "total": "10500.00"}	\N	2026-10-15 00:40:52.112905+00	28
235	crear	pago	33	{"estado": "pendiente", "pedido": 33}	\N	2026-10-15 00:40:54.004384+00	28
236	transicion	pedido	33	{"a": "cancelado", "de": "pendiente"}	\N	2026-10-15 00:40:58.784353+00	28
237	crear	pedido	34	{"cupon": null, "total": "45000.00"}	\N	2026-10-15 00:41:02.642502+00	29
238	crear	pago	34	{"estado": "pendiente", "pedido": 34}	\N	2026-10-15 00:41:04.604286+00	29
239	aprobar	pago	34	{"estado": "aprobado", "pedido": 34}	\N	2026-10-15 00:41:06.693037+00	29
240	transicion	pedido	34	{"a": "cancelado", "de": "pendiente"}	\N	2026-10-15 00:41:11.452498+00	29
241	crear	pedido	35	{"cupon": null, "total": "2500.00"}	\N	2026-10-15 00:41:15.318469+00	30
242	crear	pago	35	{"estado": "pendiente", "pedido": 35}	\N	2026-10-15 00:41:17.234355+00	30
243	transicion	pedido	35	{"a": "cancelado", "de": "pendiente"}	\N	2026-10-15 00:41:22.027996+00	30
244	crear	pedido	36	{"cupon": null, "total": "30000.00"}	\N	2026-10-15 00:41:25.859778+00	21
245	crear	pago	36	{"estado": "pendiente", "pedido": 36}	\N	2026-10-15 00:41:27.807893+00	21
246	aprobar	pago	36	{"estado": "aprobado", "pedido": 36}	\N	2026-10-15 00:41:29.895653+00	21
247	transicion	pedido	36	{"a": "cancelado", "de": "pendiente"}	\N	2026-10-15 00:41:34.539883+00	21
248	crear	pedido	37	{"cupon": null, "total": "22000.00"}	\N	2026-10-15 00:41:38.589437+00	26
249	crear	pago	37	{"estado": "pendiente", "pedido": 37}	\N	2026-10-15 00:41:40.522628+00	26
250	aprobar	pago	37	{"estado": "aprobado", "pedido": 37}	\N	2026-10-15 00:41:42.653347+00	26
251	transicion	pedido	37	{"a": "confirmado", "de": "pendiente"}	\N	2026-10-15 00:41:44.274334+00	20
252	crear	pedido	38	{"cupon": null, "total": "45000.00"}	\N	2026-10-15 00:41:48.077806+00	27
253	crear	pago	38	{"estado": "pendiente", "pedido": 38}	\N	2026-10-15 00:41:50.025926+00	27
254	aprobar	pago	38	{"estado": "aprobado", "pedido": 38}	\N	2026-10-15 00:41:52.140042+00	27
255	transicion	pedido	38	{"a": "confirmado", "de": "pendiente"}	\N	2026-10-15 00:41:53.746383+00	18
256	crear	pedido	39	{"cupon": null, "total": "6000.00"}	\N	2026-10-15 00:41:57.626996+00	28
257	crear	pago	39	{"estado": "pendiente", "pedido": 39}	\N	2026-10-15 00:41:59.575122+00	28
258	aprobar	pago	39	{"estado": "aprobado", "pedido": 39}	\N	2026-10-15 00:42:01.664825+00	28
259	transicion	pedido	39	{"a": "confirmado", "de": "pendiente"}	\N	2026-10-15 00:42:03.24187+00	17
260	transicion	pedido	39	{"a": "en_preparacion", "de": "confirmado"}	\N	2026-10-15 00:42:04.637292+00	17
261	crear	pedido	40	{"cupon": null, "total": "9000.00"}	\N	2026-10-15 00:42:08.531573+00	29
262	crear	pago	40	{"estado": "pendiente", "pedido": 40}	\N	2026-10-15 00:42:10.441607+00	29
263	aprobar	pago	40	{"estado": "aprobado", "pedido": 40}	\N	2026-10-15 00:42:12.587955+00	17
264	transicion	pedido	40	{"a": "confirmado", "de": "pendiente"}	\N	2026-10-15 00:42:14.182585+00	17
265	transicion	pedido	40	{"a": "en_preparacion", "de": "confirmado"}	\N	2026-10-15 00:42:15.667835+00	17
266	crear	pedido	41	{"cupon": null, "total": "3500.00"}	\N	2026-10-15 00:42:19.691014+00	30
267	crear	pago	41	{"estado": "pendiente", "pedido": 41}	\N	2026-10-15 00:42:21.575658+00	30
268	aprobar	pago	41	{"estado": "aprobado", "pedido": 41}	\N	2026-10-15 00:42:23.702477+00	30
269	transicion	pedido	41	{"a": "confirmado", "de": "pendiente"}	\N	2026-10-15 00:42:25.294189+00	17
270	transicion	pedido	41	{"a": "en_preparacion", "de": "confirmado"}	\N	2026-10-15 00:42:26.715958+00	17
271	transicion	pedido	41	{"a": "en_camino", "de": "en_preparacion"}	\N	2026-10-15 00:42:28.116258+00	17
272	crear	pedido	42	{"cupon": null, "total": "7000.00"}	\N	2026-10-15 00:42:31.989059+00	22
273	crear	pago	42	{"estado": "pendiente", "pedido": 42}	\N	2026-10-15 00:42:33.929365+00	22
274	crear	pedido	43	{"cupon": null, "total": "45000.00"}	\N	2026-10-15 00:42:37.774824+00	23
275	crear	pedido	44	{"cupon": null, "total": "9000.00"}	\N	2026-10-15 00:42:41.645664+00	24
276	crear	pago	43	{"estado": "pendiente", "pedido": 44}	\N	2026-10-15 00:42:43.556675+00	24
277	crear	pedido	45	{"cupon": null, "total": "20000.00"}	\N	2026-10-15 00:42:47.428496+00	25
278	crear	resena	1	{"calificacion": 5}	\N	2026-10-15 00:42:49.203776+00	21
279	responder	resena	1	{}	\N	2026-10-15 00:42:50.415615+00	17
280	crear	resena	2	{"calificacion": 5}	\N	2026-10-15 00:42:52.018045+00	22
281	responder	resena	2	{}	\N	2026-10-15 00:42:53.277733+00	18
282	crear	resena	3	{"calificacion": 4}	\N	2026-10-15 00:42:54.854784+00	23
283	crear	resena	4	{"calificacion": 5}	\N	2026-10-15 00:42:56.449403+00	24
284	responder	resena	4	{}	\N	2026-10-15 00:42:57.672961+00	20
285	crear	resena	5	{"calificacion": 4}	\N	2026-10-15 00:42:59.278324+00	25
286	crear	resena	6	{"calificacion": 5}	\N	2026-10-15 00:43:00.857332+00	26
287	responder	resena	6	{}	\N	2026-10-15 00:43:02.072091+00	18
288	crear	resena	7	{"calificacion": 4}	\N	2026-10-15 00:43:03.657925+00	27
289	responder	resena	7	{}	\N	2026-10-15 00:43:04.900033+00	17
290	crear	resena	8	{"calificacion": 5}	\N	2026-10-15 00:43:06.480992+00	28
291	crear	resena	9	{"calificacion": 5}	\N	2026-10-15 00:43:08.114677+00	29
292	responder	resena	9	{}	\N	2026-10-15 00:43:09.349942+00	19
293	crear	resena	10	{"calificacion": 4}	\N	2026-10-15 00:43:10.938708+00	30
294	crear	resena	11	{"calificacion": 5}	\N	2026-10-15 00:43:12.539195+00	21
295	responder	resena	11	{}	\N	2026-10-15 00:43:13.790094+00	18
296	crear	resena	12	{"calificacion": 4}	\N	2026-10-15 00:43:15.373987+00	22
297	crear	resena	13	{"calificacion": 5}	\N	2026-10-15 00:43:16.985211+00	23
298	crear	resena	14	{"calificacion": 5}	\N	2026-10-15 00:43:18.554433+00	24
299	responder	resena	14	{}	\N	2026-10-15 00:43:19.792637+00	18
300	crear	resena	15	{"calificacion": 4}	\N	2026-10-15 00:43:21.411673+00	25
\.


--
-- Data for Name: auth_group; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.auth_group (id, name) FROM stdin;
\.


--
-- Data for Name: auth_group_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.auth_group_permissions (id, group_id, permission_id) FROM stdin;
\.


--
-- Data for Name: auth_permission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.auth_permission (id, name, content_type_id, codename) FROM stdin;
1	Can add log entry	1	add_logentry
2	Can change log entry	1	change_logentry
3	Can delete log entry	1	delete_logentry
4	Can view log entry	1	view_logentry
5	Can add permission	2	add_permission
6	Can change permission	2	change_permission
7	Can delete permission	2	delete_permission
8	Can view permission	2	view_permission
9	Can add group	3	add_group
10	Can change group	3	change_group
11	Can delete group	3	delete_group
12	Can view group	3	view_group
13	Can add content type	4	add_contenttype
14	Can change content type	4	change_contenttype
15	Can delete content type	4	delete_contenttype
16	Can view content type	4	view_contenttype
17	Can add session	5	add_session
18	Can change session	5	change_session
19	Can delete session	5	delete_session
20	Can view session	5	view_session
21	Can add Blacklisted Token	6	add_blacklistedtoken
22	Can change Blacklisted Token	6	change_blacklistedtoken
23	Can delete Blacklisted Token	6	delete_blacklistedtoken
24	Can view Blacklisted Token	6	view_blacklistedtoken
25	Can add Outstanding Token	7	add_outstandingtoken
26	Can change Outstanding Token	7	change_outstandingtoken
27	Can delete Outstanding Token	7	delete_outstandingtoken
28	Can view Outstanding Token	7	view_outstandingtoken
29	Can add usuario	8	add_usuario
30	Can change usuario	8	change_usuario
31	Can delete usuario	8	delete_usuario
32	Can view usuario	8	view_usuario
33	Can add verificación de vendedor	9	add_vendedor
34	Can change verificación de vendedor	9	change_vendedor
35	Can delete verificación de vendedor	9	delete_vendedor
36	Can view verificación de vendedor	9	view_vendedor
37	Can add categoría	10	add_categoria
38	Can change categoría	10	change_categoria
39	Can delete categoría	10	delete_categoria
40	Can view categoría	10	view_categoria
41	Can add producto	11	add_producto
42	Can change producto	11	change_producto
43	Can delete producto	11	delete_producto
44	Can view producto	11	view_producto
45	Can add imagen de producto	12	add_imagenproducto
46	Can change imagen de producto	12	change_imagenproducto
47	Can delete imagen de producto	12	delete_imagenproducto
48	Can view imagen de producto	12	view_imagenproducto
49	Can add puesto	13	add_puesto
50	Can change puesto	13	change_puesto
51	Can delete puesto	13	delete_puesto
52	Can view puesto	13	view_puesto
53	Can add puesto-categoría	14	add_puestocategoria
54	Can change puesto-categoría	14	change_puestocategoria
55	Can delete puesto-categoría	14	delete_puestocategoria
56	Can view puesto-categoría	14	view_puestocategoria
57	Can add pedido	15	add_pedido
58	Can change pedido	15	change_pedido
59	Can delete pedido	15	delete_pedido
60	Can view pedido	15	view_pedido
61	Can add ítem de pedido	16	add_itempedido
62	Can change ítem de pedido	16	change_itempedido
63	Can delete ítem de pedido	16	delete_itempedido
64	Can view ítem de pedido	16	view_itempedido
65	Can add pago	17	add_pago
66	Can change pago	17	change_pago
67	Can delete pago	17	delete_pago
68	Can view pago	17	view_pago
69	Can add dirección	18	add_direccion
70	Can change dirección	18	change_direccion
71	Can delete dirección	18	delete_direccion
72	Can view dirección	18	view_direccion
73	Can add notificación	19	add_notificacion
74	Can change notificación	19	change_notificacion
75	Can delete notificación	19	delete_notificacion
76	Can view notificación	19	view_notificacion
77	Can add reseña	20	add_resena
78	Can change reseña	20	change_resena
79	Can delete reseña	20	delete_resena
80	Can view reseña	20	view_resena
81	Can add cupón	21	add_cupon
82	Can change cupón	21	change_cupon
83	Can delete cupón	21	delete_cupon
84	Can view cupón	21	view_cupon
85	Can add uso de cupón	22	add_usocupon
86	Can change uso de cupón	22	change_usocupon
87	Can delete uso de cupón	22	delete_usocupon
88	Can view uso de cupón	22	view_usocupon
89	Can add registro de auditoría	23	add_registroauditoria
90	Can change registro de auditoría	23	change_registroauditoria
91	Can delete registro de auditoría	23	delete_registroauditoria
92	Can view registro de auditoría	23	view_registroauditoria
\.


--
-- Data for Name: catalog_categoria; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.catalog_categoria (id, nombre, activa, id_categoria_padre_id) FROM stdin;
9	Comida	t	\N
10	Artesanías	t	\N
11	Ropa	t	\N
12	Frutas y verduras	t	\N
13	Bebidas	t	\N
14	Arepas	t	9
15	Pescados y mariscos	t	9
16	Dulces típicos	t	9
\.


--
-- Data for Name: catalog_imagenproducto; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.catalog_imagenproducto (id, archivo, orden, id_producto_id) FROM stdin;
\.


--
-- Data for Name: catalog_producto; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.catalog_producto (id, nombre, descripcion, precio, stock, unidad_medida, estado, id_categoria_id, id_puesto_id) FROM stdin;
44	Friche de chivo	Friche guajiro con hueso.	28000.00	60	porcion	activo	9	7
46	Sopa de guandú	Sopa de guandú con carne.	15000.00	50	porcion	activo	9	7
47	Bollo limpio	Bollo de maíz tradicional.	2000.00	180	unidad	activo	9	7
50	Chinchorro wayuu	Chinchorro tejido en crochet.	180000.00	8	unidad	activo	10	8
51	Sombrero wayuu	Sombrero tejido artesanal.	35000.00	25	unidad	activo	10	8
52	Pulsera wayuu	Pulsera de hilos de colores.	12000.00	80	unidad	activo	10	8
54	Blusa bordada	Blusa con bordado wayuu.	55000.00	18	unidad	activo	11	8
61	Coco (unidad)	Coco fresco de la costa.	3000.00	100	unidad	activo	12	9
62	Jugo natural de mango	Jugo de mango 1 litro.	6000.00	60	litro	activo	13	9
65	Arroz de camarón	Arroz con camarón fresco.	28000.00	30	porcion	activo	15	10
66	Sopa de mariscos	Sopa con camarón y jaiba.	35000.00	25	porcion	activo	15	10
67	Sancocho de guandú	Sancocho costeño.	18000.00	40	porcion	activo	9	10
71	Alegría de coco	Alegría de coco y panela.	2500.00	150	unidad	activo	16	11
73	Dulce de papaya	Dulce de papaya en panela.	8000.00	60	unidad	activo	16	11
74	Queso costeño (kg)	Queso costeño freso.	15000.00	50	kg	activo	9	11
75	Suero costeño	Suero costeño para arepas.	10000.00	40	litro	activo	9	11
79	Jaiba (docena)	Jaiba fresca.	25000.00	30	docena	activo	15	12
80	Lisa (kg)	Lisa fresca de la costa.	16000.00	35	kg	activo	15	12
70	Enrollado de coco	Enrollado de coco tradicional.	3000.00	135	unidad	activo	16	11
45	Chivo guisado	Chivo guisado con arroz de coco.	25000.00	54	porcion	activo	9	7
58	Piña (unidad)	Piña criolla.	6000.00	58	unidad	activo	12	9
64	Mojarra al ajillo	Mojarra frita al ajillo.	32000.00	34	porcion	activo	15	10
53	Guayabera artesanal	Guayabera bordada a mano.	60000.00	18	unidad	activo	11	8
77	Sierra (kg)	Sierra fresca del día.	18000.00	38	kg	activo	15	12
42	Arepa de queso	Arepa asada con queso costeño.	4000.00	216	unidad	activo	14	7
55	Sandalias wayuu	Sandalias tejidas a mano.	70000.00	13	unidad	activo	11	8
68	Arroz de coco	Arroz de coco con pasas.	8000.00	58	porcion	activo	9	10
48	Jugo de corozo	Jugo natural de corozo.	5000.00	118	unidad	activo	13	7
56	Mango de azúcar (kg)	Mango dulce de temporada.	4000.00	147	kg	activo	12	9
57	Patilla (kg)	Patilla fresca y dulce.	2500.00	198	kg	activo	12	9
63	Pescado frito	Pescado frito con patacón.	30000.00	44	porcion	activo	15	10
69	Cerdo asado	Cerdo asado con arepa.	22000.00	29	porcion	activo	9	10
78	Camarón (kg)	Camarón fresco de la bahía.	45000.00	24	kg	activo	15	12
72	Cocadas	Cocadas horneadas.	2000.00	177	unidad	activo	16	11
43	Enrollado de dulce (x3)	Enrollado de coco y panela.	9000.00	79	unidad	activo	16	7
41	Arepa de huevo	Arepa frita rellena de huevo.	3500.00	297	unidad	activo	14	7
59	Melón (unidad)	Melón maduro.	7000.00	44	unidad	activo	12	9
49	Mochila wayuu	Mochila tejida a mano.	45000.00	28	unidad	activo	10	8
60	Aguacate (kg)	Aguacate criollo.	9000.00	69	kg	activo	12	9
76	Bocachico (kg)	Bocachico fresco del río.	20000.00	42	kg	activo	15	12
\.


--
-- Data for Name: catalog_puesto; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.catalog_puesto (id, nombre, descripcion, direccion, latitud, longitud, horario, ofrece_domicilio, estado, id_vendedor_id) FROM stdin;
7	Palenque de Carmen	Comida tradicional guajira y desayunos recién hechos.	Mercado Viejo, Carrera 2 #7-23	11.544440	-72.907490	Lun-Sáb 6:00-14:00	t	activo	17
8	Tejidos Guajiro	Mochilas, chinchorros y artesanías wayuu.	Plaza Padilla, local 12	11.546120	-72.909870	Lun-Dom 9:00-19:00	t	activo	18
9	Frutas del Caribe	Frutas frescas de la región y jugos naturales.	Calle 15 #8-40, Barrio Centro	11.542350	-72.905610	Lun-Dom 5:30-18:00	t	activo	19
10	Cocina de la Abuela	Comidas, pescados y mariscos al estilo guajiro.	Carrera 7 #12-05, Barrio El Dividivi	11.548900	-72.912340	Mar-Dom 10:00-20:00	t	activo	20
11	Dulces de Carmen	Dulces típicos, queso y suero costeño.	Calle 9 #4-11, Barrio Camino Nuevo	11.540870	-72.903220	Lun-Sáb 7:00-17:00	t	activo	17
12	Pescadería La Bahía	Pescado y mariscos frescos del día.	Muelle Turístico, Zona Costera	11.550230	-72.915670	Lun-Dom 5:00-15:00	t	activo	18
\.


--
-- Data for Name: catalog_puestocategoria; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.catalog_puestocategoria (id, id_categoria_id, id_puesto_id) FROM stdin;
14	14	7
15	16	7
16	9	7
17	13	7
18	10	8
19	11	8
20	12	9
21	13	9
22	15	10
23	9	10
24	16	11
25	9	11
26	15	12
\.


--
-- Data for Name: django_admin_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.django_admin_log (id, action_time, object_id, object_repr, action_flag, change_message, content_type_id, user_id) FROM stdin;
\.


--
-- Data for Name: django_content_type; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.django_content_type (id, app_label, model) FROM stdin;
1	admin	logentry
2	auth	permission
3	auth	group
4	contenttypes	contenttype
5	sessions	session
6	token_blacklist	blacklistedtoken
7	token_blacklist	outstandingtoken
8	accounts	usuario
9	accounts	vendedor
10	catalog	categoria
11	catalog	producto
12	catalog	imagenproducto
13	catalog	puesto
14	catalog	puestocategoria
15	orders	pedido
16	orders	itempedido
17	payments	pago
18	addresses	direccion
19	notifications	notificacion
20	reviews	resena
21	promotions	cupon
22	promotions	usocupon
23	audit	registroauditoria
\.


--
-- Data for Name: django_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.django_migrations (id, app, name, applied) FROM stdin;
1	contenttypes	0001_initial	2026-10-15 00:27:07.664696+00
2	contenttypes	0002_remove_content_type_name	2026-10-15 00:27:08.468359+00
3	auth	0001_initial	2026-10-15 00:27:10.984799+00
4	auth	0002_alter_permission_name_max_length	2026-10-15 00:27:11.452546+00
5	auth	0003_alter_user_email_max_length	2026-10-15 00:27:11.769906+00
6	auth	0004_alter_user_username_opts	2026-10-15 00:27:12.241557+00
7	auth	0005_alter_user_last_login_null	2026-10-15 00:27:12.709305+00
8	auth	0006_require_contenttypes_0002	2026-10-15 00:27:13.186805+00
9	auth	0007_alter_validators_add_error_messages	2026-10-15 00:27:13.648695+00
10	auth	0008_alter_user_username_max_length	2026-10-15 00:27:14.124249+00
11	auth	0009_alter_user_last_name_max_length	2026-10-15 00:27:14.622264+00
12	auth	0010_alter_group_name_max_length	2026-10-15 00:27:15.426895+00
13	auth	0011_update_proxy_permissions	2026-10-15 00:27:15.759898+00
14	auth	0012_alter_user_first_name_max_length	2026-10-15 00:27:16.226661+00
15	accounts	0001_initial	2026-10-15 00:27:19.38465+00
16	accounts	0002_vendedor	2026-10-15 00:27:20.654102+00
17	addresses	0001_initial	2026-10-15 00:27:21.800509+00
18	admin	0001_initial	2026-10-15 00:27:23.120739+00
19	admin	0002_logentry_remove_auto_add	2026-10-15 00:27:23.311167+00
20	admin	0003_logentry_add_action_flag_choices	2026-10-15 00:27:23.773045+00
21	audit	0001_initial	2026-10-15 00:27:25.59131+00
22	catalog	0001_initial	2026-10-15 00:27:30.477722+00
23	orders	0001_initial	2026-10-15 00:27:34.026318+00
24	notifications	0001_initial	2026-10-15 00:27:35.339715+00
25	orders	0002_pedido_direccion_entrega	2026-10-15 00:27:36.76345+00
26	orders	0003_remove_pedido_pedido_totales_no_negativos_and_more	2026-10-15 00:27:37.874702+00
27	promotions	0001_initial	2026-10-15 00:27:41.587909+00
28	orders	0004_pedido_id_cupon_pedido_pedido_totales_no_negativos_and_more	2026-10-15 00:27:42.768502+00
29	payments	0001_initial	2026-10-15 00:27:43.602435+00
30	payments	0002_pago_fecha_reembolso	2026-10-15 00:27:44.087751+00
31	payments	0003_remove_pago_pago_montos_no_negativos_and_more	2026-10-15 00:27:45.568144+00
32	reviews	0001_initial	2026-10-15 00:27:47.356122+00
33	sessions	0001_initial	2026-10-15 00:27:48.311141+00
34	token_blacklist	0001_initial	2026-10-15 00:27:49.631361+00
35	token_blacklist	0002_outstandingtoken_jti_hex	2026-10-15 00:27:50.105946+00
36	token_blacklist	0003_auto_20171017_2007	2026-10-15 00:27:50.766062+00
37	token_blacklist	0004_auto_20171017_2013	2026-10-15 00:27:51.733774+00
38	token_blacklist	0005_remove_outstandingtoken_jti	2026-10-15 00:27:52.370443+00
39	token_blacklist	0006_auto_20171017_2113	2026-10-15 00:27:53.018846+00
40	token_blacklist	0007_auto_20171017_2214	2026-10-15 00:27:54.552929+00
41	token_blacklist	0008_migrate_to_bigautofield	2026-10-15 00:27:56.896525+00
42	token_blacklist	0010_fix_migrate_to_bigautofield	2026-10-15 00:27:57.279315+00
43	token_blacklist	0011_linearizes_history	2026-10-15 00:27:57.750967+00
44	token_blacklist	0012_alter_outstandingtoken_user	2026-10-15 00:27:58.267537+00
45	token_blacklist	0013_alter_blacklistedtoken_options_and_more	2026-10-15 00:27:58.739185+00
\.


--
-- Data for Name: django_session; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.django_session (session_key, session_data, expire_date) FROM stdin;
\.


--
-- Data for Name: notifications_notificacion; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications_notificacion (id, tipo, titulo, mensaje, leida, fecha_creacion, fecha_lectura, id_pedido_id, id_usuario_id) FROM stdin;
74	pedido_creado	Nuevo pedido	Recibiste el pedido #16.	f	2026-10-15 00:36:55.322048+00	\N	16	17
75	pedido_confirmado	Pedido confirmado	Tu pedido #16 fue confirmado por el vendedor.	f	2026-10-15 00:37:00.977936+00	\N	16	21
76	pedido_en_preparacion	Pedido en preparación	El vendedor está preparando tu pedido #16.	f	2026-10-15 00:37:02.36261+00	\N	16	21
77	pedido_en_camino	Pedido en camino	Tu pedido #16 va en camino.	f	2026-10-15 00:37:03.792204+00	\N	16	21
78	pedido_entregado	Pedido entregado	Tu pedido #16 fue entregado. ¡Gracias por comprar!	f	2026-10-15 00:37:05.215944+00	\N	16	21
79	pedido_creado	Nuevo pedido	Recibiste el pedido #17.	f	2026-10-15 00:37:09.083866+00	\N	17	18
80	pedido_confirmado	Pedido confirmado	Tu pedido #17 fue confirmado por el vendedor.	f	2026-10-15 00:37:14.663587+00	\N	17	22
81	pedido_en_preparacion	Pedido en preparación	El vendedor está preparando tu pedido #17.	f	2026-10-15 00:37:16.059979+00	\N	17	22
82	pedido_en_camino	Pedido en camino	Tu pedido #17 va en camino.	f	2026-10-15 00:37:17.433915+00	\N	17	22
83	pedido_entregado	Pedido entregado	Tu pedido #17 fue entregado. ¡Gracias por comprar!	f	2026-10-15 00:37:18.838115+00	\N	17	22
84	pedido_creado	Nuevo pedido	Recibiste el pedido #18.	f	2026-10-15 00:37:24.125866+00	\N	18	19
85	pedido_confirmado	Pedido confirmado	Tu pedido #18 fue confirmado por el vendedor.	f	2026-10-15 00:37:29.771031+00	\N	18	23
86	pedido_en_preparacion	Pedido en preparación	El vendedor está preparando tu pedido #18.	f	2026-10-15 00:37:31.164476+00	\N	18	23
87	pedido_en_camino	Pedido en camino	Tu pedido #18 va en camino.	f	2026-10-15 00:37:32.645829+00	\N	18	23
88	pedido_entregado	Pedido entregado	Tu pedido #18 fue entregado. ¡Gracias por comprar!	f	2026-10-15 00:37:34.048089+00	\N	18	23
89	pedido_creado	Nuevo pedido	Recibiste el pedido #19.	f	2026-10-15 00:37:37.980451+00	\N	19	20
90	pedido_confirmado	Pedido confirmado	Tu pedido #19 fue confirmado por el vendedor.	f	2026-10-15 00:37:43.603693+00	\N	19	24
91	pedido_en_preparacion	Pedido en preparación	El vendedor está preparando tu pedido #19.	f	2026-10-15 00:37:44.994221+00	\N	19	24
92	pedido_en_camino	Pedido en camino	Tu pedido #19 va en camino.	f	2026-10-15 00:37:46.375975+00	\N	19	24
93	pedido_entregado	Pedido entregado	Tu pedido #19 fue entregado. ¡Gracias por comprar!	f	2026-10-15 00:37:47.791893+00	\N	19	24
94	pedido_creado	Nuevo pedido	Recibiste el pedido #20.	f	2026-10-15 00:37:51.671531+00	\N	20	17
95	pedido_confirmado	Pedido confirmado	Tu pedido #20 fue confirmado por el vendedor.	f	2026-10-15 00:37:57.353783+00	\N	20	25
96	pedido_en_preparacion	Pedido en preparación	El vendedor está preparando tu pedido #20.	f	2026-10-15 00:37:58.779472+00	\N	20	25
97	pedido_en_camino	Pedido en camino	Tu pedido #20 va en camino.	f	2026-10-15 00:38:00.151453+00	\N	20	25
98	pedido_entregado	Pedido entregado	Tu pedido #20 fue entregado. ¡Gracias por comprar!	f	2026-10-15 00:38:01.566408+00	\N	20	25
99	pedido_creado	Nuevo pedido	Recibiste el pedido #21.	f	2026-10-15 00:38:05.447995+00	\N	21	18
100	pedido_confirmado	Pedido confirmado	Tu pedido #21 fue confirmado por el vendedor.	f	2026-10-15 00:38:11.145871+00	\N	21	26
101	pedido_en_preparacion	Pedido en preparación	El vendedor está preparando tu pedido #21.	f	2026-10-15 00:38:12.602808+00	\N	21	26
102	pedido_en_camino	Pedido en camino	Tu pedido #21 va en camino.	f	2026-10-15 00:38:14.005064+00	\N	21	26
103	pedido_entregado	Pedido entregado	Tu pedido #21 fue entregado. ¡Gracias por comprar!	f	2026-10-15 00:38:15.38193+00	\N	21	26
104	pedido_creado	Nuevo pedido	Recibiste el pedido #22.	f	2026-10-15 00:38:19.46272+00	\N	22	17
105	pedido_confirmado	Pedido confirmado	Tu pedido #22 fue confirmado por el vendedor.	f	2026-10-15 00:38:25.111769+00	\N	22	27
106	pedido_en_preparacion	Pedido en preparación	El vendedor está preparando tu pedido #22.	f	2026-10-15 00:38:26.507192+00	\N	22	27
107	pedido_en_camino	Pedido en camino	Tu pedido #22 va en camino.	f	2026-10-15 00:38:27.911397+00	\N	22	27
108	pedido_entregado	Pedido entregado	Tu pedido #22 fue entregado. ¡Gracias por comprar!	f	2026-10-15 00:38:29.30779+00	\N	22	27
109	pedido_creado	Nuevo pedido	Recibiste el pedido #23.	f	2026-10-15 00:38:34.396333+00	\N	23	18
110	pedido_confirmado	Pedido confirmado	Tu pedido #23 fue confirmado por el vendedor.	f	2026-10-15 00:38:40.034223+00	\N	23	28
111	pedido_en_preparacion	Pedido en preparación	El vendedor está preparando tu pedido #23.	f	2026-10-15 00:38:41.443317+00	\N	23	28
112	pedido_en_camino	Pedido en camino	Tu pedido #23 va en camino.	f	2026-10-15 00:38:42.841668+00	\N	23	28
113	pedido_entregado	Pedido entregado	Tu pedido #23 fue entregado. ¡Gracias por comprar!	f	2026-10-15 00:38:44.22243+00	\N	23	28
114	pedido_creado	Nuevo pedido	Recibiste el pedido #24.	f	2026-10-15 00:38:48.179217+00	\N	24	19
115	pedido_confirmado	Pedido confirmado	Tu pedido #24 fue confirmado por el vendedor.	f	2026-10-15 00:38:53.832173+00	\N	24	29
116	pedido_en_preparacion	Pedido en preparación	El vendedor está preparando tu pedido #24.	f	2026-10-15 00:38:55.248101+00	\N	24	29
117	pedido_en_camino	Pedido en camino	Tu pedido #24 va en camino.	f	2026-10-15 00:38:56.707962+00	\N	24	29
118	pedido_entregado	Pedido entregado	Tu pedido #24 fue entregado. ¡Gracias por comprar!	f	2026-10-15 00:38:58.098498+00	\N	24	29
119	pedido_creado	Nuevo pedido	Recibiste el pedido #25.	f	2026-10-15 00:39:02.09434+00	\N	25	20
120	pedido_confirmado	Pedido confirmado	Tu pedido #25 fue confirmado por el vendedor.	f	2026-10-15 00:39:07.783431+00	\N	25	30
121	pedido_en_preparacion	Pedido en preparación	El vendedor está preparando tu pedido #25.	f	2026-10-15 00:39:09.15443+00	\N	25	30
122	pedido_en_camino	Pedido en camino	Tu pedido #25 va en camino.	f	2026-10-15 00:39:10.562542+00	\N	25	30
123	pedido_entregado	Pedido entregado	Tu pedido #25 fue entregado. ¡Gracias por comprar!	f	2026-10-15 00:39:11.938436+00	\N	25	30
124	pedido_creado	Nuevo pedido	Recibiste el pedido #26.	f	2026-10-15 00:39:15.759475+00	\N	26	18
125	pedido_confirmado	Pedido confirmado	Tu pedido #26 fue confirmado por el vendedor.	f	2026-10-15 00:39:21.374355+00	\N	26	21
126	pedido_en_preparacion	Pedido en preparación	El vendedor está preparando tu pedido #26.	f	2026-10-15 00:39:22.747309+00	\N	26	21
127	pedido_en_camino	Pedido en camino	Tu pedido #26 va en camino.	f	2026-10-15 00:39:24.174955+00	\N	26	21
128	pedido_entregado	Pedido entregado	Tu pedido #26 fue entregado. ¡Gracias por comprar!	f	2026-10-15 00:39:25.565487+00	\N	26	21
129	pedido_creado	Nuevo pedido	Recibiste el pedido #27.	f	2026-10-15 00:39:29.603319+00	\N	27	18
130	pedido_confirmado	Pedido confirmado	Tu pedido #27 fue confirmado por el vendedor.	f	2026-10-15 00:39:35.270923+00	\N	27	22
131	pedido_en_preparacion	Pedido en preparación	El vendedor está preparando tu pedido #27.	f	2026-10-15 00:39:36.656578+00	\N	27	22
132	pedido_en_camino	Pedido en camino	Tu pedido #27 va en camino.	f	2026-10-15 00:39:38.042229+00	\N	27	22
133	pedido_entregado	Pedido entregado	Tu pedido #27 fue entregado. ¡Gracias por comprar!	f	2026-10-15 00:39:39.429839+00	\N	27	22
134	pedido_creado	Nuevo pedido	Recibiste el pedido #28.	f	2026-10-15 00:39:43.296445+00	\N	28	17
135	pedido_confirmado	Pedido confirmado	Tu pedido #28 fue confirmado por el vendedor.	f	2026-10-15 00:39:49.049011+00	\N	28	23
136	pedido_en_preparacion	Pedido en preparación	El vendedor está preparando tu pedido #28.	f	2026-10-15 00:39:50.475678+00	\N	28	23
137	pedido_en_camino	Pedido en camino	Tu pedido #28 va en camino.	f	2026-10-15 00:39:51.86914+00	\N	28	23
138	pedido_entregado	Pedido entregado	Tu pedido #28 fue entregado. ¡Gracias por comprar!	f	2026-10-15 00:39:53.262601+00	\N	28	23
139	pedido_creado	Nuevo pedido	Recibiste el pedido #29.	f	2026-10-15 00:39:57.067049+00	\N	29	18
140	pedido_confirmado	Pedido confirmado	Tu pedido #29 fue confirmado por el vendedor.	f	2026-10-15 00:40:02.757111+00	\N	29	24
141	pedido_en_preparacion	Pedido en preparación	El vendedor está preparando tu pedido #29.	f	2026-10-15 00:40:04.180852+00	\N	29	24
142	pedido_en_camino	Pedido en camino	Tu pedido #29 va en camino.	f	2026-10-15 00:40:05.60068+00	\N	29	24
143	pedido_entregado	Pedido entregado	Tu pedido #29 fue entregado. ¡Gracias por comprar!	f	2026-10-15 00:40:06.976574+00	\N	29	24
144	pedido_creado	Nuevo pedido	Recibiste el pedido #30.	f	2026-10-15 00:40:10.893317+00	\N	30	20
145	pedido_confirmado	Pedido confirmado	Tu pedido #30 fue confirmado por el vendedor.	f	2026-10-15 00:40:16.515019+00	\N	30	25
146	pedido_en_preparacion	Pedido en preparación	El vendedor está preparando tu pedido #30.	f	2026-10-15 00:40:17.912395+00	\N	30	25
147	pedido_en_camino	Pedido en camino	Tu pedido #30 va en camino.	f	2026-10-15 00:40:19.282429+00	\N	30	25
148	pedido_entregado	Pedido entregado	Tu pedido #30 fue entregado. ¡Gracias por comprar!	f	2026-10-15 00:40:20.66124+00	\N	30	25
149	pedido_creado	Nuevo pedido	Recibiste el pedido #31.	f	2026-10-15 00:40:25.602328+00	\N	31	17
150	pedido_confirmado	Pedido confirmado	Tu pedido #31 fue confirmado por el vendedor.	f	2026-10-15 00:40:31.1137+00	\N	31	26
151	pedido_en_preparacion	Pedido en preparación	El vendedor está preparando tu pedido #31.	f	2026-10-15 00:40:32.504235+00	\N	31	26
152	pedido_en_camino	Pedido en camino	Tu pedido #31 va en camino.	f	2026-10-15 00:40:33.899653+00	\N	31	26
153	pedido_entregado	Pedido entregado	Tu pedido #31 fue entregado. ¡Gracias por comprar!	f	2026-10-15 00:40:35.336082+00	\N	31	26
154	pedido_creado	Nuevo pedido	Recibiste el pedido #32.	f	2026-10-15 00:40:39.203022+00	\N	32	19
155	pedido_cancelado	Pedido cancelado	El pedido #32 fue cancelado.	f	2026-10-15 00:40:47.298755+00	\N	32	19
156	pedido_cancelado	Pedido cancelado	El pedido #32 fue cancelado.	f	2026-10-15 00:40:48.008668+00	\N	32	27
157	pedido_creado	Nuevo pedido	Recibiste el pedido #33.	f	2026-10-15 00:40:51.941037+00	\N	33	17
158	pedido_cancelado	Pedido cancelado	El pedido #33 fue cancelado.	f	2026-10-15 00:40:57.89671+00	\N	33	17
159	pedido_cancelado	Pedido cancelado	El pedido #33 fue cancelado.	f	2026-10-15 00:40:58.6037+00	\N	33	28
160	pedido_creado	Nuevo pedido	Recibiste el pedido #34.	f	2026-10-15 00:41:02.468687+00	\N	34	18
161	pedido_cancelado	Pedido cancelado	El pedido #34 fue cancelado.	f	2026-10-15 00:41:10.557046+00	\N	34	18
162	pedido_cancelado	Pedido cancelado	El pedido #34 fue cancelado.	f	2026-10-15 00:41:11.272823+00	\N	34	29
163	pedido_creado	Nuevo pedido	Recibiste el pedido #35.	f	2026-10-15 00:41:15.137806+00	\N	35	19
164	pedido_cancelado	Pedido cancelado	El pedido #35 fue cancelado.	f	2026-10-15 00:41:21.128637+00	\N	35	19
165	pedido_cancelado	Pedido cancelado	El pedido #35 fue cancelado.	f	2026-10-15 00:41:21.858085+00	\N	35	30
166	pedido_creado	Nuevo pedido	Recibiste el pedido #36.	f	2026-10-15 00:41:25.689869+00	\N	36	20
167	pedido_cancelado	Pedido cancelado	El pedido #36 fue cancelado.	f	2026-10-15 00:41:33.682523+00	\N	36	20
168	pedido_cancelado	Pedido cancelado	El pedido #36 fue cancelado.	f	2026-10-15 00:41:34.369+00	\N	36	21
169	pedido_creado	Nuevo pedido	Recibiste el pedido #37.	f	2026-10-15 00:41:38.413662+00	\N	37	20
170	pedido_confirmado	Pedido confirmado	Tu pedido #37 fue confirmado por el vendedor.	f	2026-10-15 00:41:44.088803+00	\N	37	26
171	pedido_creado	Nuevo pedido	Recibiste el pedido #38.	f	2026-10-15 00:41:47.892267+00	\N	38	18
172	pedido_confirmado	Pedido confirmado	Tu pedido #38 fue confirmado por el vendedor.	f	2026-10-15 00:41:53.570613+00	\N	38	27
173	pedido_creado	Nuevo pedido	Recibiste el pedido #39.	f	2026-10-15 00:41:57.456112+00	\N	39	17
174	pedido_confirmado	Pedido confirmado	Tu pedido #39 fue confirmado por el vendedor.	f	2026-10-15 00:42:03.064149+00	\N	39	28
175	pedido_en_preparacion	Pedido en preparación	El vendedor está preparando tu pedido #39.	f	2026-10-15 00:42:04.465432+00	\N	39	28
176	pedido_creado	Nuevo pedido	Recibiste el pedido #40.	f	2026-10-15 00:42:08.34506+00	\N	40	17
177	pedido_confirmado	Pedido confirmado	Tu pedido #40 fue confirmado por el vendedor.	f	2026-10-15 00:42:14.013641+00	\N	40	29
178	pedido_en_preparacion	Pedido en preparación	El vendedor está preparando tu pedido #40.	f	2026-10-15 00:42:15.483274+00	\N	40	29
179	pedido_creado	Nuevo pedido	Recibiste el pedido #41.	f	2026-10-15 00:42:19.517199+00	\N	41	17
180	pedido_confirmado	Pedido confirmado	Tu pedido #41 fue confirmado por el vendedor.	f	2026-10-15 00:42:25.117427+00	\N	41	30
181	pedido_en_preparacion	Pedido en preparación	El vendedor está preparando tu pedido #41.	f	2026-10-15 00:42:26.537257+00	\N	41	30
182	pedido_en_camino	Pedido en camino	Tu pedido #41 va en camino.	f	2026-10-15 00:42:27.93268+00	\N	41	30
183	pedido_creado	Nuevo pedido	Recibiste el pedido #42.	f	2026-10-15 00:42:31.81133+00	\N	42	19
184	pedido_creado	Nuevo pedido	Recibiste el pedido #43.	f	2026-10-15 00:42:37.592214+00	\N	43	18
185	pedido_creado	Nuevo pedido	Recibiste el pedido #44.	f	2026-10-15 00:42:41.468918+00	\N	44	19
186	pedido_creado	Nuevo pedido	Recibiste el pedido #45.	f	2026-10-15 00:42:47.257612+00	\N	45	18
187	general	¡Bienvenido!	Gracias por unirte a RioMarket, el mercado de Riohacha.	f	2026-10-15 00:43:22.098158+00	\N	\N	21
188	general	¡Bienvenido!	Gracias por unirte a RioMarket, el mercado de Riohacha.	f	2026-10-15 00:43:22.813932+00	\N	\N	22
189	general	¡Bienvenido!	Gracias por unirte a RioMarket, el mercado de Riohacha.	f	2026-10-15 00:43:23.500411+00	\N	\N	23
190	general	¡Bienvenido!	Gracias por unirte a RioMarket, el mercado de Riohacha.	f	2026-10-15 00:43:24.194701+00	\N	\N	24
191	general	¡Bienvenido!	Gracias por unirte a RioMarket, el mercado de Riohacha.	f	2026-10-15 00:43:24.895828+00	\N	\N	25
192	general	¡Bienvenido!	Gracias por unirte a RioMarket, el mercado de Riohacha.	f	2026-10-15 00:43:25.590119+00	\N	\N	26
193	general	¡Bienvenido!	Gracias por unirte a RioMarket, el mercado de Riohacha.	f	2026-10-15 00:43:26.304915+00	\N	\N	27
194	general	¡Bienvenido!	Gracias por unirte a RioMarket, el mercado de Riohacha.	f	2026-10-15 00:43:26.992371+00	\N	\N	28
195	general	¡Bienvenido!	Gracias por unirte a RioMarket, el mercado de Riohacha.	f	2026-10-15 00:43:27.694479+00	\N	\N	29
196	general	¡Bienvenido!	Gracias por unirte a RioMarket, el mercado de Riohacha.	f	2026-10-15 00:43:28.414159+00	\N	\N	30
\.


--
-- Data for Name: orders_itempedido; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.orders_itempedido (id, nombre_producto, unidad_medida, precio_unitario, cantidad, id_producto_id, id_pedido_id) FROM stdin;
17	Arepa de huevo	unidad	3500.00	2	41	16
18	Mochila wayuu	unidad	45000.00	1	49	17
19	Mango de azúcar (kg)	kg	4000.00	3	56	18
20	Patilla (kg)	kg	2500.00	2	57	18
21	Pescado frito	porcion	30000.00	1	63	19
22	Enrollado de coco	unidad	3000.00	5	70	20
23	Bocachico (kg)	kg	20000.00	2	76	21
24	Chivo guisado	porcion	25000.00	1	45	22
25	Guayabera artesanal	unidad	60000.00	1	53	23
26	Piña (unidad)	unidad	6000.00	2	58	24
27	Mojarra al ajillo	porcion	32000.00	1	64	25
28	Guayabera artesanal	unidad	60000.00	1	53	26
29	Sierra (kg)	kg	18000.00	2	77	27
30	Arepa de queso	unidad	4000.00	4	42	28
31	Sandalias wayuu	unidad	70000.00	1	55	29
32	Arroz de coco	porcion	8000.00	2	68	30
33	Jugo de corozo	unidad	5000.00	2	48	31
34	Mango de azúcar (kg)	kg	4000.00	2	56	32
35	Arepa de huevo	unidad	3500.00	3	41	33
36	Mochila wayuu	unidad	45000.00	1	49	34
37	Patilla (kg)	kg	2500.00	1	57	35
38	Pescado frito	porcion	30000.00	1	63	36
39	Cerdo asado	porcion	22000.00	1	69	37
40	Camarón (kg)	kg	45000.00	1	78	38
41	Cocadas	unidad	2000.00	3	72	39
42	Enrollado de dulce (x3)	unidad	9000.00	1	43	40
43	Arepa de huevo	unidad	3500.00	1	41	41
44	Melón (unidad)	unidad	7000.00	1	59	42
45	Mochila wayuu	unidad	45000.00	1	49	43
46	Aguacate (kg)	kg	9000.00	1	60	44
47	Bocachico (kg)	kg	20000.00	1	76	45
\.


--
-- Data for Name: orders_pedido; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.orders_pedido (id, tipo_entrega, estado, direccion_entrega, referencia_entrega, notas, subtotal, tarifa_domicilio, total, fecha_creacion, fecha_actualizacion, id_comprador_id, id_puesto_id, id_direccion_id, latitud_entrega, longitud_entrega, descuento_cupon, id_cupon_id) FROM stdin;
23	domicilio	entregado	Carrera 3 #13-60, Barrio San Martín	Diagonal al colegio	[SM-08] Pedido de demostración del mercado de Riohacha.	60000.00	0.00	55000.00	2026-10-15 00:38:32.966742+00	2026-10-15 00:38:43.354322+00	28	8	18	11.544440	-72.907490	5000.00	9
16	retiro	entregado			[SM-01] Pedido de demostración del mercado de Riohacha.	7000.00	0.00	7000.00	2026-10-15 00:36:54.261565+00	2026-10-15 00:37:04.323429+00	21	7	\N	\N	\N	0.00	\N
32	retiro	cancelado			[SM-17] Pedido de demostración del mercado de Riohacha.	8000.00	0.00	8000.00	2026-10-15 00:40:38.155242+00	2026-10-15 00:40:46.425764+00	27	9	\N	\N	\N	0.00	\N
33	retiro	cancelado			[SM-18] Pedido de demostración del mercado de Riohacha.	10500.00	0.00	10500.00	2026-10-15 00:40:50.8747+00	2026-10-15 00:40:57.00614+00	28	7	\N	\N	\N	0.00	\N
17	retiro	entregado			[SM-02] Pedido de demostración del mercado de Riohacha.	45000.00	0.00	45000.00	2026-10-15 00:37:08.046815+00	2026-10-15 00:37:17.961219+00	22	8	\N	\N	\N	0.00	\N
24	domicilio	entregado	Calle 8 #16-22, Barrio Villa Fátima	Local esquinero	[SM-09] Pedido de demostración del mercado de Riohacha.	12000.00	0.00	12000.00	2026-10-15 00:38:47.147049+00	2026-10-15 00:38:57.220627+00	29	9	19	11.544440	-72.907490	0.00	\N
28	retiro	entregado			[SM-13] Pedido de demostración del mercado de Riohacha.	16000.00	0.00	16000.00	2026-10-15 00:39:42.271122+00	2026-10-15 00:39:52.390592+00	23	7	\N	\N	\N	0.00	\N
18	retiro	entregado			[SM-03] Pedido de demostración del mercado de Riohacha.	17000.00	0.00	15300.00	2026-10-15 00:37:22.533192+00	2026-10-15 00:37:33.168255+00	23	9	\N	\N	\N	1700.00	8
25	domicilio	entregado	Carrera 10 #25-07, Barrio 31 de Octubre	Casa esquinera	[SM-10] Pedido de demostración del mercado de Riohacha.	32000.00	0.00	32000.00	2026-10-15 00:39:01.029954+00	2026-10-15 00:39:11.078155+00	30	10	20	11.544440	-72.907490	0.00	\N
19	retiro	entregado			[SM-04] Pedido de demostración del mercado de Riohacha.	30000.00	0.00	30000.00	2026-10-15 00:37:36.914113+00	2026-10-15 00:37:46.89938+00	24	10	\N	\N	\N	0.00	\N
34	retiro	cancelado			[SM-19] Pedido de demostración del mercado de Riohacha.	45000.00	0.00	45000.00	2026-10-15 00:41:01.41211+00	2026-10-15 00:41:09.683082+00	29	8	\N	\N	\N	0.00	\N
20	retiro	entregado			[SM-05] Pedido de demostración del mercado de Riohacha.	15000.00	0.00	15000.00	2026-10-15 00:37:50.611053+00	2026-10-15 00:38:00.701227+00	25	11	\N	\N	\N	0.00	\N
29	retiro	entregado			[SM-14] Pedido de demostración del mercado de Riohacha.	70000.00	0.00	70000.00	2026-10-15 00:39:56.016343+00	2026-10-15 00:40:06.110414+00	24	8	\N	\N	\N	0.00	\N
26	retiro	entregado			[SM-11] Pedido de demostración del mercado de Riohacha.	60000.00	0.00	60000.00	2026-10-15 00:39:14.708761+00	2026-10-15 00:39:24.713003+00	21	8	\N	\N	\N	0.00	\N
21	retiro	entregado			[SM-06] Pedido de demostración del mercado de Riohacha.	40000.00	0.00	40000.00	2026-10-15 00:38:04.366026+00	2026-10-15 00:38:14.517722+00	26	12	\N	\N	\N	0.00	\N
35	retiro	cancelado			[SM-20] Pedido de demostración del mercado de Riohacha.	2500.00	0.00	2500.00	2026-10-15 00:41:14.07245+00	2026-10-15 00:41:20.242954+00	30	9	\N	\N	\N	0.00	\N
36	retiro	cancelado			[SM-21] Pedido de demostración del mercado de Riohacha.	30000.00	0.00	30000.00	2026-10-15 00:41:24.633304+00	2026-10-15 00:41:32.833942+00	21	10	\N	\N	\N	0.00	\N
22	domicilio	entregado	Calle 22 #6-14, Barrio El Progreso	Reja verde	[SM-07] Pedido de demostración del mercado de Riohacha.	25000.00	0.00	25000.00	2026-10-15 00:38:18.37978+00	2026-10-15 00:38:28.433823+00	27	7	17	11.544440	-72.907490	0.00	\N
27	domicilio	entregado	Carrera 9 #14-08, Barrio El Dividivi	Portón azul	[SM-12] Pedido de demostración del mercado de Riohacha.	36000.00	0.00	36000.00	2026-10-15 00:39:28.564325+00	2026-10-15 00:39:38.559776+00	22	12	12	11.544440	-72.907490	0.00	\N
37	domicilio	confirmado	Carrera 5 #18-51, Barrio Nueva Esperanza	Edificio amarillo	[SM-26] Pedido de demostración del mercado de Riohacha.	22000.00	0.00	22000.00	2026-10-15 00:41:37.349288+00	2026-10-15 00:41:43.195307+00	26	10	16	11.544440	-72.907490	0.00	\N
30	retiro	entregado			[SM-15] Pedido de demostración del mercado de Riohacha.	16000.00	0.00	16000.00	2026-10-15 00:40:09.821116+00	2026-10-15 00:40:19.796069+00	25	10	\N	\N	\N	0.00	\N
38	retiro	confirmado			[SM-27] Pedido de demostración del mercado de Riohacha.	45000.00	0.00	45000.00	2026-10-15 00:41:46.850342+00	2026-10-15 00:41:52.669312+00	27	12	\N	\N	\N	0.00	\N
31	retiro	entregado			[SM-16] Pedido de demostración del mercado de Riohacha.	10000.00	0.00	8000.00	2026-10-15 00:40:24.175663+00	2026-10-15 00:40:34.427944+00	26	7	\N	\N	\N	2000.00	10
39	retiro	en_preparacion			[SM-28] Pedido de demostración del mercado de Riohacha.	6000.00	0.00	6000.00	2026-10-15 00:41:56.396612+00	2026-10-15 00:42:03.580719+00	28	11	\N	\N	\N	0.00	\N
40	retiro	en_preparacion			[SM-29] Pedido de demostración del mercado de Riohacha.	9000.00	0.00	9000.00	2026-10-15 00:42:07.291415+00	2026-10-15 00:42:14.525334+00	29	7	\N	\N	\N	0.00	\N
41	domicilio	en_camino	Carrera 10 #25-07, Barrio 31 de Octubre	Casa esquinera	[SM-30] Pedido de demostración del mercado de Riohacha.	3500.00	0.00	3500.00	2026-10-15 00:42:18.476248+00	2026-10-15 00:42:27.064569+00	30	7	20	11.544440	-72.907490	0.00	\N
42	retiro	pendiente			[SM-22] Pedido de demostración del mercado de Riohacha.	7000.00	0.00	7000.00	2026-10-15 00:42:30.751831+00	2026-10-15 00:42:30.751831+00	22	9	\N	\N	\N	0.00	\N
43	retiro	pendiente			[SM-23] Pedido de demostración del mercado de Riohacha.	45000.00	0.00	45000.00	2026-10-15 00:42:36.559075+00	2026-10-15 00:42:36.559075+00	23	8	\N	\N	\N	0.00	\N
44	retiro	pendiente			[SM-24] Pedido de demostración del mercado de Riohacha.	9000.00	0.00	9000.00	2026-10-15 00:42:40.40746+00	2026-10-15 00:42:40.40746+00	24	9	\N	\N	\N	0.00	\N
45	retiro	pendiente			[SM-25] Pedido de demostración del mercado de Riohacha.	20000.00	0.00	20000.00	2026-10-15 00:42:46.194204+00	2026-10-15 00:42:46.194204+00	25	12	\N	\N	\N	0.00	\N
\.


--
-- Data for Name: payments_pago; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payments_pago (id, metodo_pago, estado, subtotal_pedido, tarifa_domicilio_aplicada, comision_plataforma, total_cobrado, referencia_gateway, datos_sandbox, notas, fecha_creacion, fecha_actualizacion, fecha_aprobacion, id_pedido_id, fecha_reembolso, descuento_aplicado) FROM stdin;
20	efectivo	aprobado	15000.00	0.00	0.00	15000.00	efectivo-cobrado	{"ultimo_evento": {"accion": "aprobado", "origen": "efectivo", "timestamp": "2026-10-15T00:37:54.328584+00:00"}}		2026-10-15 00:37:53.44095+00	2026-10-15 00:37:55.584363+00	2026-10-15 00:37:54.328584+00	20	\N	0.00
21	simulado	aprobado	40000.00	0.00	0.00	40000.00	sandbox-aprobar	{"ultimo_evento": {"accion": "aprobado", "origen": "simulacion", "timestamp": "2026-10-15T00:38:08.110904+00:00"}}		2026-10-15 00:38:07.230108+00	2026-10-15 00:38:09.368643+00	2026-10-15 00:38:08.110904+00	21	\N	0.00
22	simulado	aprobado	25000.00	0.00	0.00	25000.00	sandbox-aprobar	{"ultimo_evento": {"accion": "aprobado", "origen": "simulacion", "timestamp": "2026-10-15T00:38:22.075837+00:00"}}		2026-10-15 00:38:21.205773+00	2026-10-15 00:38:23.324784+00	2026-10-15 00:38:22.075837+00	22	\N	0.00
23	tarjeta	aprobado	60000.00	0.00	0.00	55000.00	sandbox-aprobar	{"ultimo_evento": {"accion": "aprobado", "origen": "simulacion", "timestamp": "2026-10-15T00:38:37.038729+00:00"}}		2026-10-15 00:38:36.159873+00	2026-10-15 00:38:38.273998+00	2026-10-15 00:38:37.038729+00	23	\N	5000.00
24	simulado	aprobado	12000.00	0.00	0.00	12000.00	sandbox-aprobar	{"ultimo_evento": {"accion": "aprobado", "origen": "simulacion", "timestamp": "2026-10-15T00:38:50.824551+00:00"}}		2026-10-15 00:38:49.931053+00	2026-10-15 00:38:52.073492+00	2026-10-15 00:38:50.824551+00	24	\N	0.00
25	nequi	aprobado	32000.00	0.00	0.00	32000.00	sandbox-aprobar	{"ultimo_evento": {"accion": "aprobado", "origen": "simulacion", "timestamp": "2026-10-15T00:39:04.757247+00:00"}}		2026-10-15 00:39:03.883284+00	2026-10-15 00:39:06.017914+00	2026-10-15 00:39:04.757247+00	25	\N	0.00
26	simulado	aprobado	60000.00	0.00	0.00	60000.00	sandbox-aprobar	{"ultimo_evento": {"accion": "aprobado", "origen": "simulacion", "timestamp": "2026-10-15T00:39:18.375525+00:00"}}		2026-10-15 00:39:17.498623+00	2026-10-15 00:39:19.602+00	2026-10-15 00:39:18.375525+00	26	\N	0.00
16	simulado	aprobado	7000.00	0.00	0.00	7000.00	sandbox-aprobar	{"ultimo_evento": {"accion": "aprobado", "origen": "simulacion", "timestamp": "2026-10-15T00:36:57.949809+00:00"}}		2026-10-15 00:36:57.066073+00	2026-10-15 00:36:59.213398+00	2026-10-15 00:36:57.949809+00	16	\N	0.00
17	simulado	aprobado	45000.00	0.00	0.00	45000.00	sandbox-aprobar	{"ultimo_evento": {"accion": "aprobado", "origen": "simulacion", "timestamp": "2026-10-15T00:37:11.694046+00:00"}}		2026-10-15 00:37:10.818121+00	2026-10-15 00:37:12.894172+00	2026-10-15 00:37:11.694046+00	17	\N	0.00
18	nequi	aprobado	17000.00	0.00	0.00	15300.00	sandbox-aprobar	{"ultimo_evento": {"accion": "aprobado", "origen": "simulacion", "timestamp": "2026-10-15T00:37:26.764367+00:00"}}		2026-10-15 00:37:25.893331+00	2026-10-15 00:37:28.015267+00	2026-10-15 00:37:26.764367+00	18	\N	1700.00
19	simulado	aprobado	30000.00	0.00	0.00	30000.00	sandbox-aprobar	{"ultimo_evento": {"accion": "aprobado", "origen": "simulacion", "timestamp": "2026-10-15T00:37:40.615599+00:00"}}		2026-10-15 00:37:39.749437+00	2026-10-15 00:37:41.844039+00	2026-10-15 00:37:40.615599+00	19	\N	0.00
27	simulado	aprobado	36000.00	0.00	0.00	36000.00	sandbox-aprobar	{"ultimo_evento": {"accion": "aprobado", "origen": "simulacion", "timestamp": "2026-10-15T00:39:32.275996+00:00"}}		2026-10-15 00:39:31.389334+00	2026-10-15 00:39:33.529824+00	2026-10-15 00:39:32.275996+00	27	\N	0.00
28	efectivo	aprobado	16000.00	0.00	0.00	16000.00	efectivo-cobrado	{"ultimo_evento": {"accion": "aprobado", "origen": "efectivo", "timestamp": "2026-10-15T00:39:45.983770+00:00"}}		2026-10-15 00:39:45.094182+00	2026-10-15 00:39:47.259085+00	2026-10-15 00:39:45.98377+00	28	\N	0.00
29	simulado	aprobado	70000.00	0.00	0.00	70000.00	sandbox-aprobar	{"ultimo_evento": {"accion": "aprobado", "origen": "simulacion", "timestamp": "2026-10-15T00:39:59.772931+00:00"}}		2026-10-15 00:39:58.879436+00	2026-10-15 00:40:01.017969+00	2026-10-15 00:39:59.772931+00	29	\N	0.00
30	daviplata	aprobado	16000.00	0.00	0.00	16000.00	sandbox-aprobar	{"ultimo_evento": {"accion": "aprobado", "origen": "simulacion", "timestamp": "2026-10-15T00:40:13.542556+00:00"}}		2026-10-15 00:40:12.642226+00	2026-10-15 00:40:14.770993+00	2026-10-15 00:40:13.542556+00	30	\N	0.00
31	simulado	aprobado	10000.00	0.00	0.00	8000.00	sandbox-aprobar	{"ultimo_evento": {"accion": "aprobado", "origen": "simulacion", "timestamp": "2026-10-15T00:40:28.181267+00:00"}}		2026-10-15 00:40:27.326835+00	2026-10-15 00:40:29.382363+00	2026-10-15 00:40:28.181267+00	31	\N	2000.00
34	simulado	reembolsado	45000.00	0.00	0.00	45000.00	sandbox-aprobar	{"ultimo_evento": {"accion": "reembolsado", "origen": "cancelacion_pedido", "timestamp": "2026-10-15T00:41:08.089437+00:00"}}		2026-10-15 00:41:04.242985+00	2026-10-15 00:41:09.336419+00	2026-10-15 00:41:05.130641+00	34	2026-10-15 00:41:08.089437+00	0.00
32	simulado	reembolsado	8000.00	0.00	0.00	8000.00	sandbox-aprobar	{"ultimo_evento": {"accion": "reembolsado", "origen": "cancelacion_pedido", "timestamp": "2026-10-15T00:40:44.816492+00:00"}}		2026-10-15 00:40:40.957364+00	2026-10-15 00:40:46.078134+00	2026-10-15 00:40:41.815712+00	32	2026-10-15 00:40:44.816492+00	0.00
33	simulado	anulado	10500.00	0.00	0.00	10500.00		{"ultimo_evento": {"accion": "anulado", "origen": "cancelacion_pedido", "timestamp": "2026-10-15T00:40:55.420307+00:00"}}		2026-10-15 00:40:53.667489+00	2026-10-15 00:40:56.642886+00	\N	33	\N	0.00
35	simulado	anulado	2500.00	0.00	0.00	2500.00		{"ultimo_evento": {"accion": "anulado", "origen": "cancelacion_pedido", "timestamp": "2026-10-15T00:41:18.660043+00:00"}}		2026-10-15 00:41:16.889651+00	2026-10-15 00:41:19.883597+00	\N	35	\N	0.00
39	simulado	aprobado	6000.00	0.00	0.00	6000.00	sandbox-aprobar	{"ultimo_evento": {"accion": "aprobado", "origen": "simulacion", "timestamp": "2026-10-15T00:42:00.105351+00:00"}}		2026-10-15 00:41:59.215768+00	2026-10-15 00:42:01.32207+00	2026-10-15 00:42:00.105351+00	39	\N	0.00
36	simulado	reembolsado	30000.00	0.00	0.00	30000.00	sandbox-aprobar	{"ultimo_evento": {"accion": "reembolsado", "origen": "cancelacion_pedido", "timestamp": "2026-10-15T00:41:31.274473+00:00"}}		2026-10-15 00:41:27.45538+00	2026-10-15 00:41:32.480449+00	2026-10-15 00:41:28.346929+00	36	2026-10-15 00:41:31.274473+00	0.00
37	simulado	aprobado	22000.00	0.00	0.00	22000.00	sandbox-aprobar	{"ultimo_evento": {"accion": "aprobado", "origen": "simulacion", "timestamp": "2026-10-15T00:41:41.063603+00:00"}}		2026-10-15 00:41:40.17429+00	2026-10-15 00:41:42.290094+00	2026-10-15 00:41:41.063603+00	37	\N	0.00
38	transferencia	aprobado	45000.00	0.00	0.00	45000.00	sandbox-aprobar	{"ultimo_evento": {"accion": "aprobado", "origen": "simulacion", "timestamp": "2026-10-15T00:41:50.556158+00:00"}}		2026-10-15 00:41:49.660708+00	2026-10-15 00:41:51.784596+00	2026-10-15 00:41:50.556158+00	38	\N	0.00
40	efectivo	aprobado	9000.00	0.00	0.00	9000.00	efectivo-cobrado	{"ultimo_evento": {"accion": "aprobado", "origen": "efectivo", "timestamp": "2026-10-15T00:42:10.979663+00:00"}}		2026-10-15 00:42:10.101788+00	2026-10-15 00:42:12.233486+00	2026-10-15 00:42:10.979663+00	40	\N	0.00
41	simulado	aprobado	3500.00	0.00	0.00	3500.00	sandbox-aprobar	{"ultimo_evento": {"accion": "aprobado", "origen": "simulacion", "timestamp": "2026-10-15T00:42:22.094190+00:00"}}		2026-10-15 00:42:21.240718+00	2026-10-15 00:42:23.349957+00	2026-10-15 00:42:22.09419+00	41	\N	0.00
42	simulado	pendiente	7000.00	0.00	0.00	7000.00		{}		2026-10-15 00:42:33.583681+00	2026-10-15 00:42:33.583681+00	\N	42	\N	0.00
43	simulado	pendiente	9000.00	0.00	0.00	9000.00		{}		2026-10-15 00:42:43.192441+00	2026-10-15 00:42:43.192441+00	\N	44	\N	0.00
\.


--
-- Data for Name: promotions_cupon; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.promotions_cupon (id, codigo, tipo_descuento, valor, monto_minimo_pedido, tope_descuento, usos_totales, usos_por_usuario, fecha_inicio, fecha_fin, activo, fecha_creacion, id_puesto_id) FROM stdin;
6	BIENVENIDA2026	porcentaje	10.00	0.00	10000.00	\N	1	\N	\N	t	2026-10-15 00:36:44.182134+00	\N
7	MERCADO5000	monto	5000.00	30000.00	\N	\N	\N	\N	\N	t	2026-10-15 00:36:45.936905+00	\N
8	FRESCO10	porcentaje	10.00	10000.00	\N	\N	\N	\N	\N	t	2026-10-15 00:36:47.73171+00	\N
9	TEJIDOS5000	monto	5000.00	40000.00	\N	\N	\N	\N	\N	t	2026-10-15 00:36:49.662257+00	8
10	PALENQUE2000	monto	2000.00	10000.00	\N	\N	\N	\N	\N	t	2026-10-15 00:36:51.579122+00	7
\.


--
-- Data for Name: promotions_usocupon; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.promotions_usocupon (id, descuento_aplicado, fecha_uso, id_cupon_id, id_pedido_id, id_usuario_id) FROM stdin;
3	1700.00	2026-10-15 00:37:23.079063+00	8	18	23
4	5000.00	2026-10-15 00:38:33.329994+00	9	23	28
5	2000.00	2026-10-15 00:40:24.535996+00	10	31	26
\.


--
-- Data for Name: reviews_resena; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reviews_resena (id, calificacion, comentario, respuesta, fecha_respuesta, visible, fecha_creacion, fecha_actualizacion, id_pedido_id, id_puesto_id, id_usuario_id) FROM stdin;
1	5	Las arepas de huevo son las mejores de Riohacha.	¡Gracias por tu visita!	2026-10-15 00:42:49.377595+00	t	2026-10-15 00:42:49.029958+00	2026-10-15 00:42:50.242775+00	16	7	21
2	5	La mochila es hermosa y llegó impecable.	Gracias, vuelve pronto.	2026-10-15 00:42:52.210419+00	t	2026-10-15 00:42:51.838368+00	2026-10-15 00:42:53.092196+00	17	8	22
3	4	Frutas frescas y buen precio.		\N	t	2026-10-15 00:42:54.68096+00	2026-10-15 00:42:54.68096+00	18	9	23
4	5	El pescado frito estaba delicioso.	¡Buen provecho!	2026-10-15 00:42:56.629085+00	t	2026-10-15 00:42:56.272658+00	2026-10-15 00:42:57.487422+00	19	10	24
5	4	Los enrollados muy ricos, entrega puntual.		\N	t	2026-10-15 00:42:59.09866+00	2026-10-15 00:42:59.09866+00	20	11	25
6	5	Pescado fresco y buen servicio.	Gracias por confiar.	2026-10-15 00:43:01.033094+00	t	2026-10-15 00:43:00.668863+00	2026-10-15 00:43:01.889487+00	21	12	26
7	4	Buen chivo guisado, aunque demoró un poco.	Mejoraremos los tiempos.	2026-10-15 00:43:03.834673+00	t	2026-10-15 00:43:03.475319+00	2026-10-15 00:43:04.712547+00	22	7	27
8	5	Guayabera de excelente calidad.		\N	t	2026-10-15 00:43:06.314986+00	2026-10-15 00:43:06.314986+00	23	8	28
9	5	La piña estaba dulcísima.	¡Gracias!	2026-10-15 00:43:08.289465+00	t	2026-10-15 00:43:07.938906+00	2026-10-15 00:43:09.163431+00	24	9	29
10	4	Rico el arroz de camarón.		\N	t	2026-10-15 00:43:10.759034+00	2026-10-15 00:43:10.759034+00	25	10	30
11	5	Segunda compra y sigue excelente.	Gracias por volver.	2026-10-15 00:43:12.719846+00	t	2026-10-15 00:43:12.368306+00	2026-10-15 00:43:13.598701+00	26	8	21
12	4	Buena mojarra, bien empacada.		\N	t	2026-10-15 00:43:15.200157+00	2026-10-15 00:43:15.200157+00	27	12	22
13	5	El jugo de corozo es refrescante.		\N	t	2026-10-15 00:43:16.809433+00	2026-10-15 00:43:16.809433+00	28	7	23
14	5	Sandalias cómodas y bonitas.	¡Que las disfrutes!	2026-10-15 00:43:18.725323+00	t	2026-10-15 00:43:18.376712+00	2026-10-15 00:43:19.594409+00	29	8	24
15	4	Arroz de coco muy sabroso.		\N	t	2026-10-15 00:43:21.22028+00	2026-10-15 00:43:21.22028+00	30	10	25
\.


--
-- Data for Name: token_blacklist_blacklistedtoken; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.token_blacklist_blacklistedtoken (id, blacklisted_at, token_id) FROM stdin;
\.


--
-- Data for Name: token_blacklist_outstandingtoken; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.token_blacklist_outstandingtoken (id, token, created_at, expires_at, user_id, jti) FROM stdin;
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: realtime; Owner: -
--

COPY realtime.schema_migrations (version, inserted_at) FROM stdin;
20211116024918	2026-10-14 23:44:05
20211116045059	2026-10-14 23:44:05
20211116050929	2026-10-14 23:44:05
20211116051442	2026-10-14 23:44:05
20211116212300	2026-10-14 23:44:05
20211116213355	2026-10-14 23:44:05
20211116213934	2026-10-14 23:44:05
20211116214523	2026-10-14 23:44:05
20211122062447	2026-10-14 23:44:05
20211124070109	2026-10-14 23:44:05
20211202204204	2026-10-14 23:44:05
20211202204605	2026-10-14 23:44:05
20211210212804	2026-10-14 23:44:05
20211228014915	2026-10-14 23:44:05
20220107221237	2026-10-14 23:44:05
20220228202821	2026-10-14 23:44:05
20220312004840	2026-10-14 23:44:05
20220603231003	2026-10-14 23:44:05
20220603232444	2026-10-14 23:44:05
20220615214548	2026-10-14 23:44:05
20220712093339	2026-10-14 23:44:05
20220908172859	2026-10-14 23:44:05
20220916233421	2026-10-14 23:44:05
20230119133233	2026-10-14 23:44:05
20230128025114	2026-10-14 23:44:05
20230128025212	2026-10-14 23:44:05
20230227211149	2026-10-14 23:44:05
20230228184745	2026-10-14 23:44:05
20230308225145	2026-10-14 23:44:05
20230328144023	2026-10-14 23:44:05
20231018144023	2026-10-14 23:44:05
20231204144023	2026-10-14 23:44:05
20231204144024	2026-10-14 23:44:05
20231204144025	2026-10-14 23:44:05
20240108234812	2026-10-14 23:44:05
20240109165339	2026-10-14 23:44:05
20240227174441	2026-10-14 23:44:05
20240311171622	2026-10-14 23:44:05
20240321100241	2026-10-14 23:44:05
20240401105812	2026-10-14 23:44:05
20240418121054	2026-10-14 23:44:05
20240523004032	2026-10-14 23:44:05
20240618124746	2026-10-14 23:44:05
20240801235015	2026-10-14 23:44:05
20240805133720	2026-10-14 23:44:05
20240827160934	2026-10-14 23:44:05
20240919163303	2026-10-14 23:44:05
20240919163305	2026-10-14 23:44:05
20241019105805	2026-10-14 23:44:05
20241030150047	2026-10-14 23:44:05
20241108114728	2026-10-14 23:44:05
20241121104152	2026-10-14 23:44:05
20241130184212	2026-10-14 23:44:05
20241220035512	2026-10-14 23:44:05
20241220123912	2026-10-14 23:44:05
20241224161212	2026-10-14 23:44:05
20250107150512	2026-10-14 23:44:05
20250110162412	2026-10-14 23:44:05
20250123174212	2026-10-14 23:44:05
20250128220012	2026-10-14 23:44:05
20250506224012	2026-10-14 23:44:05
20250523164012	2026-10-14 23:44:05
20250714121412	2026-10-14 23:44:05
20250905041441	2026-10-14 23:44:05
20251103001201	2026-10-14 23:44:05
20251120212548	2026-10-14 23:44:05
20251120215549	2026-10-14 23:44:05
20260218120000	2026-10-14 23:44:05
20260326120000	2026-10-14 23:44:05
20260514120000	2026-10-14 23:44:05
20260527120000	2026-10-14 23:44:05
20260528120000	2026-10-14 23:44:05
20260603120000	2026-10-14 23:44:05
20260605120000	2026-10-14 23:44:05
20260606110000	2026-10-14 23:44:05
20260616120000	2026-10-14 23:44:05
20260624120000	2026-10-14 23:44:05
20260626120000	2026-10-14 23:44:05
20260706120000	2026-10-14 23:44:05
20260707120000	2026-10-14 23:44:05
20260709120000	2026-10-14 23:44:05
20260714120000	2026-10-14 23:44:05
20260827120000	2026-10-14 23:44:05
20260914120000	2026-10-14 23:44:05
20260916120000	2026-10-14 23:44:05
20260922120000	2026-10-14 23:44:05
20260925120000	2026-10-14 23:44:05
20260928120000	2026-10-14 23:44:05
20261002120000	2026-10-14 23:44:05
\.


--
-- Data for Name: subscription; Type: TABLE DATA; Schema: realtime; Owner: -
--

COPY realtime.subscription (id, subscription_id, entity, filters, claims, created_at, action_filter, selected_columns) FROM stdin;
\.


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.buckets (id, name, owner, created_at, updated_at, public, avif_autodetection, file_size_limit, allowed_mime_types, owner_id, type, versioning_status, lifecycle_configuration, lifecycle_configuration_generation) FROM stdin;
\.


--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.buckets_analytics (name, type, format, created_at, updated_at, id, deleted_at) FROM stdin;
\.


--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.buckets_vectors (id, type, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.migrations (id, name, hash, executed_at) FROM stdin;
0	create-migrations-table	e18db593bcde2aca2a408c4d1100f6abba2195df	2026-10-14 23:44:04.948128
1	initialmigration	6ab16121fbaa08bbd11b712d05f358f9b555d777	2026-10-14 23:44:04.954163
2	storage-schema	f6a1fa2c93cbcd16d4e487b362e45fca157a8dbd	2026-10-14 23:44:04.958329
3	pathtoken-column	2cb1b0004b817b29d5b0a971af16bafeede4b70d	2026-10-14 23:44:04.981453
4	add-migrations-rls	427c5b63fe1c5937495d9c635c263ee7a5905058	2026-10-14 23:44:04.992604
5	add-size-functions	79e081a1455b63666c1294a440f8ad4b1e6a7f84	2026-10-14 23:44:04.996177
6	change-column-name-in-get-size	ded78e2f1b5d7e616117897e6443a925965b30d2	2026-10-14 23:44:05.00087
7	add-rls-to-buckets	e7e7f86adbc51049f341dfe8d30256c1abca17aa	2026-10-14 23:44:05.005135
8	add-public-to-buckets	fd670db39ed65f9d08b01db09d6202503ca2bab3	2026-10-14 23:44:05.008376
9	fix-search-function	af597a1b590c70519b464a4ab3be54490712796b	2026-10-14 23:44:05.012387
10	search-files-search-function	b595f05e92f7e91211af1bbfe9c6a13bb3391e16	2026-10-14 23:44:05.01563
11	add-trigger-to-auto-update-updated_at-column	7425bdb14366d1739fa8a18c83100636d74dcaa2	2026-10-14 23:44:05.019992
12	add-automatic-avif-detection-flag	8e92e1266eb29518b6a4c5313ab8f29dd0d08df9	2026-10-14 23:44:05.024322
13	add-bucket-custom-limits	cce962054138135cd9a8c4bcd531598684b25e7d	2026-10-14 23:44:05.027615
14	use-bytes-for-max-size	941c41b346f9802b411f06f30e972ad4744dad27	2026-10-14 23:44:05.033021
15	add-can-insert-object-function	934146bc38ead475f4ef4b555c524ee5d66799e5	2026-10-14 23:44:05.062681
16	add-version	76debf38d3fd07dcfc747ca49096457d95b1221b	2026-10-14 23:44:05.066496
17	drop-owner-foreign-key	f1cbb288f1b7a4c1eb8c38504b80ae2a0153d101	2026-10-14 23:44:05.069967
18	add_owner_id_column_deprecate_owner	e7a511b379110b08e2f214be852c35414749fe66	2026-10-14 23:44:05.075863
19	alter-default-value-objects-id	02e5e22a78626187e00d173dc45f58fa66a4f043	2026-10-14 23:44:05.080731
20	list-objects-with-delimiter	cd694ae708e51ba82bf012bba00caf4f3b6393b7	2026-10-14 23:44:05.086928
21	s3-multipart-uploads	8c804d4a566c40cd1e4cc5b3725a664a9303657f	2026-10-14 23:44:05.093733
22	s3-multipart-uploads-big-ints	9737dc258d2397953c9953d9b86920b8be0cdb73	2026-10-14 23:44:05.109931
23	optimize-search-function	9d7e604cddc4b56a5422dc68c9313f4a1b6f132c	2026-10-14 23:44:05.126624
24	operation-function	8312e37c2bf9e76bbe841aa5fda889206d2bf8aa	2026-10-14 23:44:05.131588
25	custom-metadata	d974c6057c3db1c1f847afa0e291e6165693b990	2026-10-14 23:44:05.135582
26	objects-prefixes	215cabcb7f78121892a5a2037a09fedf9a1ae322	2026-10-14 23:44:05.140865
27	search-v2	859ba38092ac96eb3964d83bf53ccc0b141663a6	2026-10-14 23:44:05.145529
28	object-bucket-name-sorting	c73a2b5b5d4041e39705814fd3a1b95502d38ce4	2026-10-14 23:44:05.150641
29	create-prefixes	ad2c1207f76703d11a9f9007f821620017a66c21	2026-10-14 23:44:05.153488
30	update-object-levels	2be814ff05c8252fdfdc7cfb4b7f5c7e17f0bed6	2026-10-14 23:44:05.156178
31	objects-level-index	b40367c14c3440ec75f19bbce2d71e914ddd3da0	2026-10-14 23:44:05.158957
32	backward-compatible-index-on-objects	e0c37182b0f7aee3efd823298fb3c76f1042c0f7	2026-10-14 23:44:05.161817
33	backward-compatible-index-on-prefixes	b480e99ed951e0900f033ec4eb34b5bdcb4e3d49	2026-10-14 23:44:05.16534
34	optimize-search-function-v1	ca80a3dc7bfef894df17108785ce29a7fc8ee456	2026-10-14 23:44:05.168424
35	add-insert-trigger-prefixes	458fe0ffd07ec53f5e3ce9df51bfdf4861929ccc	2026-10-14 23:44:05.172503
36	optimise-existing-functions	6ae5fca6af5c55abe95369cd4f93985d1814ca8f	2026-10-14 23:44:05.175303
37	add-bucket-name-length-trigger	3944135b4e3e8b22d6d4cbb568fe3b0b51df15c1	2026-10-14 23:44:05.178125
38	iceberg-catalog-flag-on-buckets	02716b81ceec9705aed84aa1501657095b32e5c5	2026-10-14 23:44:05.181911
39	add-search-v2-sort-support	6706c5f2928846abee18461279799ad12b279b78	2026-10-14 23:44:05.187659
40	fix-prefix-race-conditions-optimized	7ad69982ae2d372b21f48fc4829ae9752c518f6b	2026-10-14 23:44:05.19048
41	add-object-level-update-trigger	07fcf1a22165849b7a029deed059ffcde08d1ae0	2026-10-14 23:44:05.194539
42	rollback-prefix-triggers	771479077764adc09e2ea2043eb627503c034cd4	2026-10-14 23:44:05.197277
43	fix-object-level	84b35d6caca9d937478ad8a797491f38b8c2979f	2026-10-14 23:44:05.200089
44	vector-bucket-type	99c20c0ffd52bb1ff1f32fb992f3b351e3ef8fb3	2026-10-14 23:44:05.202899
45	vector-buckets	049e27196d77a7cb76497a85afae669d8b230953	2026-10-14 23:44:05.206127
46	buckets-objects-grants	fedeb96d60fefd8e02ab3ded9fbde05632f84aed	2026-10-14 23:44:05.214318
47	iceberg-table-metadata	649df56855c24d8b36dd4cc1aeb8251aa9ad42c2	2026-10-14 23:44:05.21732
48	iceberg-catalog-ids	e0e8b460c609b9999ccd0df9ad14294613eed939	2026-10-14 23:44:05.220235
49	buckets-objects-grants-postgres	072b1195d0d5a2f888af6b2302a1938dd94b8b3d	2026-10-14 23:44:05.230214
50	search-v2-optimised	6323ac4f850aa14e7387eb32102869578b5bd478	2026-10-14 23:44:05.233938
51	index-backward-compatible-search	2ee395d433f76e38bcd3856debaf6e0e5b674011	2026-10-14 23:44:05.286565
52	drop-not-used-indexes-and-functions	5cc44c8696749ac11dd0dc37f2a3802075f3a171	2026-10-14 23:44:05.288178
53	drop-index-lower-name	d0cb18777d9e2a98ebe0bc5cc7a42e57ebe41854	2026-10-14 23:44:05.294812
54	drop-index-object-level	6289e048b1472da17c31a7eba1ded625a6457e67	2026-10-14 23:44:05.296822
55	prevent-direct-deletes	262a4798d5e0f2e7c8970232e03ce8be695d5819	2026-10-14 23:44:05.298397
56	fix-optimized-search-function	b823ed1e418101032fa01374edc9a436e54e3ed4	2026-10-14 23:44:05.302859
57	s3-multipart-uploads-metadata	f127886e00d1b374fadbc7c6b31e09336aad5287	2026-10-14 23:44:05.306779
58	operation-ergonomics	00ca5d483b3fe0d522133d9002ccc5df98365120	2026-10-14 23:44:05.309739
59	drop-unused-functions	38456f13e39691c2bbb4b5151d0d1cdbabd4a8c4	2026-10-14 23:44:05.313237
60	optimize-existing-functions-again	db35e1c91a9201e59f4fef8d972c2f277d68b157	2026-10-14 23:44:05.316516
61	mark-filename-immutable	fe0096517ae9d60aaec1d110172ba9036dc66bb7	2026-10-14 23:44:05.319904
62	object-versioning-core	0b855f00ff3be0bfca91efee02a9858912491a9a	2026-10-14 23:44:05.322793
63	fix-search-name-relative-to-prefix	c7485e417624f795ce8bb2da21927f48e088904d	2026-10-14 23:44:05.327649
64	fix-search-by-timestamp-sqli	0af424ecd388a39bb1645184b222185a12149675	2026-10-14 23:44:05.332042
65	objects-key-version-index	da319c4b89ba800ce795d1b699f3a70675138058	2026-10-14 23:44:05.341152
66	objects-current-version-index	191466c93aa2c46a00e36505577c5fcab8d7cb4b	2026-10-14 23:44:05.347457
67	objects-null-version-index	15bfe8c35b66642b6c78ba60060fa8793bd2207a	2026-10-14 23:44:05.355872
68	bucket-lifecycle-configuration	3c08f6f889922f399519722a932b51007c11bebc	2026-10-14 23:44:05.358671
69	validate-bucket-lifecycle-constraints	4febacaaaa0e61e2b783bef081fe03a287e65eb3	2026-10-14 23:44:05.367549
70	list-objects-with-versions	5c17c3777616cd8d7b18b82835525fa3205af57b	2026-10-14 23:44:05.383305
71	objects-delete-marker-index	6d14858e66c66f8d6accf8a2630aefd1527fddba	2026-10-14 23:44:05.408038
72	drop-bucketid-objname-index	302beb09e1b469d7d4db19566f2389d280b64aa3	2026-10-14 23:44:05.413894
73	revoke-grants-to-unused-operations	ba9244051be09f22f714fc0170a2539f8b5f0e68	2026-10-14 23:44:05.415486
\.


--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.objects (id, bucket_id, name, owner, created_at, updated_at, last_accessed_at, metadata, version, owner_id, user_metadata, archived_at, is_delete_marker, is_versioned) FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.s3_multipart_uploads (id, in_progress_size, upload_signature, bucket_id, key, version, owner_id, created_at, user_metadata, metadata) FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.s3_multipart_uploads_parts (id, upload_id, size, part_number, bucket_id, key, etag, owner_id, version, created_at) FROM stdin;
\.


--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.vector_indexes (id, name, bucket_id, data_type, dimension, distance_metric, metadata_configuration, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: secrets; Type: TABLE DATA; Schema: vault; Owner: -
--

COPY vault.secrets (id, name, description, secret, key_id, nonce, created_at, updated_at) FROM stdin;
\.


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: -
--

SELECT pg_catalog.setval('auth.refresh_tokens_id_seq', 1, false);


--
-- Name: accounts_usuario_groups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.accounts_usuario_groups_id_seq', 1, false);


--
-- Name: accounts_usuario_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.accounts_usuario_id_seq', 30, true);


--
-- Name: accounts_usuario_user_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.accounts_usuario_user_permissions_id_seq', 1, false);


--
-- Name: accounts_vendedor_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.accounts_vendedor_id_seq', 8, true);


--
-- Name: addresses_direccion_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.addresses_direccion_id_seq', 20, true);


--
-- Name: audit_registroauditoria_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.audit_registroauditoria_id_seq', 300, true);


--
-- Name: auth_group_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.auth_group_id_seq', 1, false);


--
-- Name: auth_group_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.auth_group_permissions_id_seq', 1, false);


--
-- Name: auth_permission_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.auth_permission_id_seq', 92, true);


--
-- Name: catalog_categoria_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.catalog_categoria_id_seq', 16, true);


--
-- Name: catalog_imagenproducto_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.catalog_imagenproducto_id_seq', 1, false);


--
-- Name: catalog_producto_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.catalog_producto_id_seq', 80, true);


--
-- Name: catalog_puesto_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.catalog_puesto_id_seq', 12, true);


--
-- Name: catalog_puestocategoria_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.catalog_puestocategoria_id_seq', 26, true);


--
-- Name: django_admin_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.django_admin_log_id_seq', 1, false);


--
-- Name: django_content_type_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.django_content_type_id_seq', 23, true);


--
-- Name: django_migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.django_migrations_id_seq', 45, true);


--
-- Name: notifications_notificacion_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notifications_notificacion_id_seq', 196, true);


--
-- Name: orders_itempedido_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.orders_itempedido_id_seq', 47, true);


--
-- Name: orders_pedido_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.orders_pedido_id_seq', 45, true);


--
-- Name: payments_pago_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.payments_pago_id_seq', 43, true);


--
-- Name: promotions_cupon_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.promotions_cupon_id_seq', 10, true);


--
-- Name: promotions_usocupon_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.promotions_usocupon_id_seq', 5, true);


--
-- Name: reviews_resena_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.reviews_resena_id_seq', 15, true);


--
-- Name: token_blacklist_blacklistedtoken_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.token_blacklist_blacklistedtoken_id_seq', 1, false);


--
-- Name: token_blacklist_outstandingtoken_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.token_blacklist_outstandingtoken_id_seq', 1, false);


--
-- Name: subscription_id_seq; Type: SEQUENCE SET; Schema: realtime; Owner: -
--

SELECT pg_catalog.setval('realtime.subscription_id_seq', 1, false);


--
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT amr_id_pk PRIMARY KEY (id);


--
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.audit_log_entries
    ADD CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id);


--
-- Name: custom_oauth_providers custom_oauth_providers_identifier_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_identifier_key UNIQUE (identifier);


--
-- Name: custom_oauth_providers custom_oauth_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_pkey PRIMARY KEY (id);


--
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.flow_state
    ADD CONSTRAINT flow_state_pkey PRIMARY KEY (id);


--
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_pkey PRIMARY KEY (id);


--
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id, provider);


--
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.instances
    ADD CONSTRAINT instances_pkey PRIMARY KEY (id);


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id, authentication_method);


--
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id);


--
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_last_challenged_at_key UNIQUE (last_challenged_at);


--
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_pkey PRIMARY KEY (id);


--
-- Name: mfa_recovery_code_sets mfa_recovery_code_sets_mfa_factor_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_recovery_code_sets
    ADD CONSTRAINT mfa_recovery_code_sets_mfa_factor_id_key UNIQUE (mfa_factor_id);


--
-- Name: mfa_recovery_code_sets mfa_recovery_code_sets_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_recovery_code_sets
    ADD CONSTRAINT mfa_recovery_code_sets_pkey PRIMARY KEY (id);


--
-- Name: mfa_recovery_code_sets mfa_recovery_code_sets_user_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_recovery_code_sets
    ADD CONSTRAINT mfa_recovery_code_sets_user_id_key UNIQUE (user_id);


--
-- Name: mfa_recovery_codes mfa_recovery_codes_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_recovery_codes
    ADD CONSTRAINT mfa_recovery_codes_pkey PRIMARY KEY (id);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_code_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_code_key UNIQUE (authorization_code);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_id_key UNIQUE (authorization_id);


--
-- Name: oauth_authorizations oauth_authorizations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_pkey PRIMARY KEY (id);


--
-- Name: oauth_client_states oauth_client_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_client_states
    ADD CONSTRAINT oauth_client_states_pkey PRIMARY KEY (id);


--
-- Name: oauth_clients oauth_clients_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_clients
    ADD CONSTRAINT oauth_clients_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_user_client_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_client_unique UNIQUE (user_id, client_id);


--
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_unique UNIQUE (token);


--
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_entity_id_key UNIQUE (entity_id);


--
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_pkey PRIMARY KEY (id);


--
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: scim_tokens scim_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.scim_tokens
    ADD CONSTRAINT scim_tokens_pkey PRIMARY KEY (id);


--
-- Name: scim_users scim_users_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.scim_users
    ADD CONSTRAINT scim_users_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_pkey PRIMARY KEY (id);


--
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_providers
    ADD CONSTRAINT sso_providers_pkey PRIMARY KEY (id);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: webauthn_challenges webauthn_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_challenges
    ADD CONSTRAINT webauthn_challenges_pkey PRIMARY KEY (id);


--
-- Name: webauthn_credentials webauthn_credentials_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_pkey PRIMARY KEY (id);


--
-- Name: accounts_usuario accounts_usuario_celular_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_usuario
    ADD CONSTRAINT accounts_usuario_celular_key UNIQUE (celular);


--
-- Name: accounts_usuario accounts_usuario_correo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_usuario
    ADD CONSTRAINT accounts_usuario_correo_key UNIQUE (correo);


--
-- Name: accounts_usuario_groups accounts_usuario_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_usuario_groups
    ADD CONSTRAINT accounts_usuario_groups_pkey PRIMARY KEY (id);


--
-- Name: accounts_usuario_groups accounts_usuario_groups_usuario_id_group_id_90f476d3_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_usuario_groups
    ADD CONSTRAINT accounts_usuario_groups_usuario_id_group_id_90f476d3_uniq UNIQUE (usuario_id, group_id);


--
-- Name: accounts_usuario accounts_usuario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_usuario
    ADD CONSTRAINT accounts_usuario_pkey PRIMARY KEY (id);


--
-- Name: accounts_usuario_user_permissions accounts_usuario_user_pe_usuario_id_permission_id_0065a2ce_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_usuario_user_permissions
    ADD CONSTRAINT accounts_usuario_user_pe_usuario_id_permission_id_0065a2ce_uniq UNIQUE (usuario_id, permission_id);


--
-- Name: accounts_usuario_user_permissions accounts_usuario_user_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_usuario_user_permissions
    ADD CONSTRAINT accounts_usuario_user_permissions_pkey PRIMARY KEY (id);


--
-- Name: accounts_vendedor accounts_vendedor_cedula_huella_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_vendedor
    ADD CONSTRAINT accounts_vendedor_cedula_huella_key UNIQUE (cedula_huella);


--
-- Name: accounts_vendedor accounts_vendedor_id_usuario_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_vendedor
    ADD CONSTRAINT accounts_vendedor_id_usuario_id_key UNIQUE (id_usuario_id);


--
-- Name: accounts_vendedor accounts_vendedor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_vendedor
    ADD CONSTRAINT accounts_vendedor_pkey PRIMARY KEY (id);


--
-- Name: addresses_direccion addresses_direccion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addresses_direccion
    ADD CONSTRAINT addresses_direccion_pkey PRIMARY KEY (id);


--
-- Name: audit_registroauditoria audit_registroauditoria_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_registroauditoria
    ADD CONSTRAINT audit_registroauditoria_pkey PRIMARY KEY (id);


--
-- Name: auth_group auth_group_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_group
    ADD CONSTRAINT auth_group_name_key UNIQUE (name);


--
-- Name: auth_group_permissions auth_group_permissions_group_id_permission_id_0cd325b0_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_group_permissions
    ADD CONSTRAINT auth_group_permissions_group_id_permission_id_0cd325b0_uniq UNIQUE (group_id, permission_id);


--
-- Name: auth_group_permissions auth_group_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_group_permissions
    ADD CONSTRAINT auth_group_permissions_pkey PRIMARY KEY (id);


--
-- Name: auth_group auth_group_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_group
    ADD CONSTRAINT auth_group_pkey PRIMARY KEY (id);


--
-- Name: auth_permission auth_permission_content_type_id_codename_01ab375a_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_permission
    ADD CONSTRAINT auth_permission_content_type_id_codename_01ab375a_uniq UNIQUE (content_type_id, codename);


--
-- Name: auth_permission auth_permission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_permission
    ADD CONSTRAINT auth_permission_pkey PRIMARY KEY (id);


--
-- Name: catalog_categoria catalog_categoria_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_categoria
    ADD CONSTRAINT catalog_categoria_nombre_key UNIQUE (nombre);


--
-- Name: catalog_categoria catalog_categoria_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_categoria
    ADD CONSTRAINT catalog_categoria_pkey PRIMARY KEY (id);


--
-- Name: catalog_imagenproducto catalog_imagenproducto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_imagenproducto
    ADD CONSTRAINT catalog_imagenproducto_pkey PRIMARY KEY (id);


--
-- Name: catalog_producto catalog_producto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_producto
    ADD CONSTRAINT catalog_producto_pkey PRIMARY KEY (id);


--
-- Name: catalog_puesto catalog_puesto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_puesto
    ADD CONSTRAINT catalog_puesto_pkey PRIMARY KEY (id);


--
-- Name: catalog_puestocategoria catalog_puestocategoria_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_puestocategoria
    ADD CONSTRAINT catalog_puestocategoria_pkey PRIMARY KEY (id);


--
-- Name: django_admin_log django_admin_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.django_admin_log
    ADD CONSTRAINT django_admin_log_pkey PRIMARY KEY (id);


--
-- Name: django_content_type django_content_type_app_label_model_76bd3d3b_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.django_content_type
    ADD CONSTRAINT django_content_type_app_label_model_76bd3d3b_uniq UNIQUE (app_label, model);


--
-- Name: django_content_type django_content_type_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.django_content_type
    ADD CONSTRAINT django_content_type_pkey PRIMARY KEY (id);


--
-- Name: django_migrations django_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.django_migrations
    ADD CONSTRAINT django_migrations_pkey PRIMARY KEY (id);


--
-- Name: django_session django_session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.django_session
    ADD CONSTRAINT django_session_pkey PRIMARY KEY (session_key);


--
-- Name: orders_itempedido itempedido_producto_unico_por_pedido; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders_itempedido
    ADD CONSTRAINT itempedido_producto_unico_por_pedido UNIQUE (id_pedido_id, id_producto_id);


--
-- Name: notifications_notificacion notifications_notificacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications_notificacion
    ADD CONSTRAINT notifications_notificacion_pkey PRIMARY KEY (id);


--
-- Name: orders_itempedido orders_itempedido_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders_itempedido
    ADD CONSTRAINT orders_itempedido_pkey PRIMARY KEY (id);


--
-- Name: orders_pedido orders_pedido_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders_pedido
    ADD CONSTRAINT orders_pedido_pkey PRIMARY KEY (id);


--
-- Name: payments_pago payments_pago_id_pedido_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments_pago
    ADD CONSTRAINT payments_pago_id_pedido_id_key UNIQUE (id_pedido_id);


--
-- Name: payments_pago payments_pago_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments_pago
    ADD CONSTRAINT payments_pago_pkey PRIMARY KEY (id);


--
-- Name: promotions_cupon promotions_cupon_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotions_cupon
    ADD CONSTRAINT promotions_cupon_codigo_key UNIQUE (codigo);


--
-- Name: promotions_cupon promotions_cupon_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotions_cupon
    ADD CONSTRAINT promotions_cupon_pkey PRIMARY KEY (id);


--
-- Name: promotions_usocupon promotions_usocupon_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotions_usocupon
    ADD CONSTRAINT promotions_usocupon_pkey PRIMARY KEY (id);


--
-- Name: catalog_puestocategoria puesto_categoria_unica; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_puestocategoria
    ADD CONSTRAINT puesto_categoria_unica UNIQUE (id_puesto_id, id_categoria_id);


--
-- Name: reviews_resena resena_unica_por_usuario_y_puesto; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews_resena
    ADD CONSTRAINT resena_unica_por_usuario_y_puesto UNIQUE (id_usuario_id, id_puesto_id);


--
-- Name: reviews_resena reviews_resena_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews_resena
    ADD CONSTRAINT reviews_resena_pkey PRIMARY KEY (id);


--
-- Name: token_blacklist_blacklistedtoken token_blacklist_blacklistedtoken_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.token_blacklist_blacklistedtoken
    ADD CONSTRAINT token_blacklist_blacklistedtoken_pkey PRIMARY KEY (id);


--
-- Name: token_blacklist_blacklistedtoken token_blacklist_blacklistedtoken_token_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.token_blacklist_blacklistedtoken
    ADD CONSTRAINT token_blacklist_blacklistedtoken_token_id_key UNIQUE (token_id);


--
-- Name: token_blacklist_outstandingtoken token_blacklist_outstandingtoken_jti_hex_d9bdf6f7_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.token_blacklist_outstandingtoken
    ADD CONSTRAINT token_blacklist_outstandingtoken_jti_hex_d9bdf6f7_uniq UNIQUE (jti);


--
-- Name: token_blacklist_outstandingtoken token_blacklist_outstandingtoken_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.token_blacklist_outstandingtoken
    ADD CONSTRAINT token_blacklist_outstandingtoken_pkey PRIMARY KEY (id);


--
-- Name: promotions_usocupon uso_cupon_unico_por_pedido; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotions_usocupon
    ADD CONSTRAINT uso_cupon_unico_por_pedido UNIQUE (id_pedido_id);


--
-- Name: messages messages_payload_exclusive; Type: CHECK CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE realtime.messages
    ADD CONSTRAINT messages_payload_exclusive CHECK (((payload IS NULL) OR (binary_payload IS NULL))) NOT VALID;


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: subscription pk_subscription; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.subscription
    ADD CONSTRAINT pk_subscription PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: buckets_analytics buckets_analytics_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets_analytics
    ADD CONSTRAINT buckets_analytics_pkey PRIMARY KEY (id);


--
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets
    ADD CONSTRAINT buckets_pkey PRIMARY KEY (id);


--
-- Name: buckets_vectors buckets_vectors_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets_vectors
    ADD CONSTRAINT buckets_vectors_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id);


--
-- Name: vector_indexes vector_indexes_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_pkey PRIMARY KEY (id);


--
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);


--
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: custom_oauth_providers_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_created_at_idx ON auth.custom_oauth_providers USING btree (created_at);


--
-- Name: custom_oauth_providers_enabled_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_enabled_idx ON auth.custom_oauth_providers USING btree (enabled);


--
-- Name: custom_oauth_providers_identifier_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_identifier_idx ON auth.custom_oauth_providers USING btree (identifier);


--
-- Name: custom_oauth_providers_provider_type_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX custom_oauth_providers_provider_type_idx ON auth.custom_oauth_providers USING btree (provider_type);


--
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);


--
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);


--
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);


--
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);


--
-- Name: INDEX identities_email_idx; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.identities_email_idx IS 'Auth: Ensures indexed queries on the email column';


--
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);


--
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);


--
-- Name: idx_oauth_client_states_created_at; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_oauth_client_states_created_at ON auth.oauth_client_states USING btree (created_at);


--
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);


--
-- Name: idx_users_created_at_desc; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_users_created_at_desc ON auth.users USING btree (created_at DESC);


--
-- Name: idx_users_email; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_users_email ON auth.users USING btree (email);


--
-- Name: idx_users_last_sign_in_at_desc; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_users_last_sign_in_at_desc ON auth.users USING btree (last_sign_in_at DESC);


--
-- Name: idx_users_name; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_users_name ON auth.users USING btree (((raw_user_meta_data ->> 'name'::text))) WHERE ((raw_user_meta_data ->> 'name'::text) IS NOT NULL);


--
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);


--
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);


--
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);


--
-- Name: mfa_recovery_codes_set_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_recovery_codes_set_id_idx ON auth.mfa_recovery_codes USING btree (mfa_recovery_code_set_id);


--
-- Name: oauth_auth_pending_exp_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_auth_pending_exp_idx ON auth.oauth_authorizations USING btree (expires_at) WHERE (status = 'pending'::auth.oauth_authorization_status);


--
-- Name: oauth_clients_deleted_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_clients_deleted_at_idx ON auth.oauth_clients USING btree (deleted_at);


--
-- Name: oauth_consents_active_client_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_active_client_idx ON auth.oauth_consents USING btree (client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_active_user_client_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_active_user_client_idx ON auth.oauth_consents USING btree (user_id, client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_user_order_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_consents_user_order_idx ON auth.oauth_consents USING btree (user_id, granted_at DESC);


--
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);


--
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);


--
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);


--
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);


--
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);


--
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);


--
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);


--
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);


--
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);


--
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);


--
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);


--
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);


--
-- Name: scim_tokens_expires_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX scim_tokens_expires_at_idx ON auth.scim_tokens USING btree (expires_at);


--
-- Name: scim_tokens_revoked_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX scim_tokens_revoked_at_idx ON auth.scim_tokens USING btree (revoked_at);


--
-- Name: scim_tokens_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX scim_tokens_sso_provider_id_idx ON auth.scim_tokens USING btree (sso_provider_id);


--
-- Name: scim_tokens_token_hash_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX scim_tokens_token_hash_key ON auth.scim_tokens USING btree (token_hash);


--
-- Name: scim_users_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX scim_users_created_at_idx ON auth.scim_users USING btree (sso_provider_id, created_at, id) WHERE (deleted_at IS NULL);


--
-- Name: scim_users_deleted_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX scim_users_deleted_at_idx ON auth.scim_users USING btree (deleted_at);


--
-- Name: scim_users_external_id_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX scim_users_external_id_key ON auth.scim_users USING btree (sso_provider_id, external_id) WHERE ((external_id IS NOT NULL) AND (deleted_at IS NULL));


--
-- Name: scim_users_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX scim_users_id_idx ON auth.scim_users USING btree (sso_provider_id, id) WHERE (deleted_at IS NULL);


--
-- Name: scim_users_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX scim_users_sso_provider_id_idx ON auth.scim_users USING btree (sso_provider_id);


--
-- Name: scim_users_updated_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX scim_users_updated_at_idx ON auth.scim_users USING btree (sso_provider_id, updated_at, id) WHERE (deleted_at IS NULL);


--
-- Name: scim_users_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX scim_users_user_id_idx ON auth.scim_users USING btree (user_id);


--
-- Name: scim_users_user_name_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX scim_users_user_name_idx ON auth.scim_users USING btree (sso_provider_id, user_name COLLATE "C", id) WHERE (deleted_at IS NULL);


--
-- Name: scim_users_user_name_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX scim_users_user_name_key ON auth.scim_users USING btree (sso_provider_id, user_name) WHERE (deleted_at IS NULL);


--
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);


--
-- Name: sessions_oauth_client_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_oauth_client_id_idx ON auth.sessions USING btree (oauth_client_id);


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);


--
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));


--
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);


--
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));


--
-- Name: sso_providers_resource_id_pattern_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sso_providers_resource_id_pattern_idx ON auth.sso_providers USING btree (resource_id text_pattern_ops);


--
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);


--
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);


--
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);


--
-- Name: INDEX users_email_partial_key; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.users_email_partial_key IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));


--
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);


--
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);


--
-- Name: webauthn_challenges_expires_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX webauthn_challenges_expires_at_idx ON auth.webauthn_challenges USING btree (expires_at);


--
-- Name: webauthn_challenges_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX webauthn_challenges_user_id_idx ON auth.webauthn_challenges USING btree (user_id);


--
-- Name: webauthn_credentials_credential_id_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX webauthn_credentials_credential_id_key ON auth.webauthn_credentials USING btree (credential_id);


--
-- Name: webauthn_credentials_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX webauthn_credentials_user_id_idx ON auth.webauthn_credentials USING btree (user_id);


--
-- Name: accounts_usuario_celular_569672da_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_usuario_celular_569672da_like ON public.accounts_usuario USING btree (celular varchar_pattern_ops);


--
-- Name: accounts_usuario_correo_1c6aa2c7_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_usuario_correo_1c6aa2c7_like ON public.accounts_usuario USING btree (correo varchar_pattern_ops);


--
-- Name: accounts_usuario_groups_group_id_81d91a41; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_usuario_groups_group_id_81d91a41 ON public.accounts_usuario_groups USING btree (group_id);


--
-- Name: accounts_usuario_groups_usuario_id_8eb16911; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_usuario_groups_usuario_id_8eb16911 ON public.accounts_usuario_groups USING btree (usuario_id);


--
-- Name: accounts_usuario_user_permissions_permission_id_3de42c14; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_usuario_user_permissions_permission_id_3de42c14 ON public.accounts_usuario_user_permissions USING btree (permission_id);


--
-- Name: accounts_usuario_user_permissions_usuario_id_d048ad71; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_usuario_user_permissions_usuario_id_d048ad71 ON public.accounts_usuario_user_permissions USING btree (usuario_id);


--
-- Name: accounts_vendedor_cedula_huella_d4bb273a_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_vendedor_cedula_huella_d4bb273a_like ON public.accounts_vendedor USING btree (cedula_huella varchar_pattern_ops);


--
-- Name: accounts_vendedor_id_revisor_id_d7ac8fb1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_vendedor_id_revisor_id_d7ac8fb1 ON public.accounts_vendedor USING btree (id_revisor_id);


--
-- Name: addresses_direccion_id_usuario_id_2f6ad862; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX addresses_direccion_id_usuario_id_2f6ad862 ON public.addresses_direccion USING btree (id_usuario_id);


--
-- Name: audit_registroauditoria_id_usuario_id_2cca3e92; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_registroauditoria_id_usuario_id_2cca3e92 ON public.audit_registroauditoria USING btree (id_usuario_id);


--
-- Name: auditoria_accion_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auditoria_accion_idx ON public.audit_registroauditoria USING btree (accion);


--
-- Name: auditoria_entidad_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auditoria_entidad_idx ON public.audit_registroauditoria USING btree (entidad, id_entidad);


--
-- Name: auditoria_fecha_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auditoria_fecha_idx ON public.audit_registroauditoria USING btree (fecha_creacion);


--
-- Name: auth_group_name_a6ea08ec_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auth_group_name_a6ea08ec_like ON public.auth_group USING btree (name varchar_pattern_ops);


--
-- Name: auth_group_permissions_group_id_b120cbf9; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auth_group_permissions_group_id_b120cbf9 ON public.auth_group_permissions USING btree (group_id);


--
-- Name: auth_group_permissions_permission_id_84c5c92e; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auth_group_permissions_permission_id_84c5c92e ON public.auth_group_permissions USING btree (permission_id);


--
-- Name: auth_permission_content_type_id_2f476e4b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auth_permission_content_type_id_2f476e4b ON public.auth_permission USING btree (content_type_id);


--
-- Name: catalog_categoria_id_categoria_padre_id_56714595; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX catalog_categoria_id_categoria_padre_id_56714595 ON public.catalog_categoria USING btree (id_categoria_padre_id);


--
-- Name: catalog_categoria_nombre_2c3fc6c4_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX catalog_categoria_nombre_2c3fc6c4_like ON public.catalog_categoria USING btree (nombre varchar_pattern_ops);


--
-- Name: catalog_imagenproducto_id_producto_id_ffb313ab; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX catalog_imagenproducto_id_producto_id_ffb313ab ON public.catalog_imagenproducto USING btree (id_producto_id);


--
-- Name: catalog_producto_id_categoria_id_24920292; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX catalog_producto_id_categoria_id_24920292 ON public.catalog_producto USING btree (id_categoria_id);


--
-- Name: catalog_producto_id_puesto_id_73769f19; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX catalog_producto_id_puesto_id_73769f19 ON public.catalog_producto USING btree (id_puesto_id);


--
-- Name: catalog_puesto_id_vendedor_id_80607243; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX catalog_puesto_id_vendedor_id_80607243 ON public.catalog_puesto USING btree (id_vendedor_id);


--
-- Name: catalog_puestocategoria_id_categoria_id_3e0f0a30; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX catalog_puestocategoria_id_categoria_id_3e0f0a30 ON public.catalog_puestocategoria USING btree (id_categoria_id);


--
-- Name: catalog_puestocategoria_id_puesto_id_e7fc516e; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX catalog_puestocategoria_id_puesto_id_e7fc516e ON public.catalog_puestocategoria USING btree (id_puesto_id);


--
-- Name: direccion_predeterminada_unica_por_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX direccion_predeterminada_unica_por_usuario ON public.addresses_direccion USING btree (id_usuario_id) WHERE es_predeterminada;


--
-- Name: django_admin_log_content_type_id_c4bce8eb; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX django_admin_log_content_type_id_c4bce8eb ON public.django_admin_log USING btree (content_type_id);


--
-- Name: django_admin_log_user_id_c564eba6; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX django_admin_log_user_id_c564eba6 ON public.django_admin_log USING btree (user_id);


--
-- Name: django_session_expire_date_a5c62663; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX django_session_expire_date_a5c62663 ON public.django_session USING btree (expire_date);


--
-- Name: django_session_session_key_c0390e0f_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX django_session_session_key_c0390e0f_like ON public.django_session USING btree (session_key varchar_pattern_ops);


--
-- Name: notifications_notificacion_id_pedido_id_c3dd94f0; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_notificacion_id_pedido_id_c3dd94f0 ON public.notifications_notificacion USING btree (id_pedido_id);


--
-- Name: notifications_notificacion_id_usuario_id_4dc24873; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_notificacion_id_usuario_id_4dc24873 ON public.notifications_notificacion USING btree (id_usuario_id);


--
-- Name: orders_itempedido_id_pedido_id_b2f7791a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_itempedido_id_pedido_id_b2f7791a ON public.orders_itempedido USING btree (id_pedido_id);


--
-- Name: orders_itempedido_id_producto_id_72694daa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_itempedido_id_producto_id_72694daa ON public.orders_itempedido USING btree (id_producto_id);


--
-- Name: orders_pedido_id_comprador_id_606dfd58; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_pedido_id_comprador_id_606dfd58 ON public.orders_pedido USING btree (id_comprador_id);


--
-- Name: orders_pedido_id_cupon_id_b468b5aa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_pedido_id_cupon_id_b468b5aa ON public.orders_pedido USING btree (id_cupon_id);


--
-- Name: orders_pedido_id_direccion_id_9ce55aa3; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_pedido_id_direccion_id_9ce55aa3 ON public.orders_pedido USING btree (id_direccion_id);


--
-- Name: orders_pedido_id_puesto_id_d8afb9da; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_pedido_id_puesto_id_d8afb9da ON public.orders_pedido USING btree (id_puesto_id);


--
-- Name: promotions_cupon_codigo_7b5437e5_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX promotions_cupon_codigo_7b5437e5_like ON public.promotions_cupon USING btree (codigo varchar_pattern_ops);


--
-- Name: promotions_cupon_id_puesto_id_91fd00c6; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX promotions_cupon_id_puesto_id_91fd00c6 ON public.promotions_cupon USING btree (id_puesto_id);


--
-- Name: promotions_usocupon_id_cupon_id_7b21b04d; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX promotions_usocupon_id_cupon_id_7b21b04d ON public.promotions_usocupon USING btree (id_cupon_id);


--
-- Name: promotions_usocupon_id_pedido_id_b64d590f; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX promotions_usocupon_id_pedido_id_b64d590f ON public.promotions_usocupon USING btree (id_pedido_id);


--
-- Name: promotions_usocupon_id_usuario_id_21d30322; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX promotions_usocupon_id_usuario_id_21d30322 ON public.promotions_usocupon USING btree (id_usuario_id);


--
-- Name: reviews_resena_id_pedido_id_8c14451c; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reviews_resena_id_pedido_id_8c14451c ON public.reviews_resena USING btree (id_pedido_id);


--
-- Name: reviews_resena_id_puesto_id_aca08df0; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reviews_resena_id_puesto_id_aca08df0 ON public.reviews_resena USING btree (id_puesto_id);


--
-- Name: reviews_resena_id_usuario_id_1e8a725a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reviews_resena_id_usuario_id_1e8a725a ON public.reviews_resena USING btree (id_usuario_id);


--
-- Name: token_blacklist_outstandingtoken_jti_hex_d9bdf6f7_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX token_blacklist_outstandingtoken_jti_hex_d9bdf6f7_like ON public.token_blacklist_outstandingtoken USING btree (jti varchar_pattern_ops);


--
-- Name: token_blacklist_outstandingtoken_user_id_83bc629a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX token_blacklist_outstandingtoken_user_id_83bc629a ON public.token_blacklist_outstandingtoken USING btree (user_id);


--
-- Name: ix_realtime_subscription_entity; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX ix_realtime_subscription_entity ON realtime.subscription USING btree (entity);


--
-- Name: messages_inserted_at_topic_index; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX messages_inserted_at_topic_index ON ONLY realtime.messages USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: subscription_subscription_id_entity_filters_action_filter_selec; Type: INDEX; Schema: realtime; Owner: -
--

CREATE UNIQUE INDEX subscription_subscription_id_entity_filters_action_filter_selec ON realtime.subscription USING btree (subscription_id, entity, filters, action_filter, COALESCE(selected_columns, '{}'::text[]));


--
-- Name: bname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);


--
-- Name: buckets_analytics_unique_name_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX buckets_analytics_unique_name_idx ON storage.buckets_analytics USING btree (name) WHERE (deleted_at IS NULL);


--
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);


--
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");


--
-- Name: idx_objects_bucket_id_name_lower; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_bucket_id_name_lower ON storage.objects USING btree (bucket_id, lower(name) COLLATE "C");


--
-- Name: idx_objects_current_version; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX idx_objects_current_version ON storage.objects USING btree (bucket_id, name COLLATE "C") WHERE (archived_at IS NULL);


--
-- Name: idx_objects_delete_markers; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_delete_markers ON storage.objects USING btree (bucket_id, name COLLATE "C") WHERE is_delete_marker;


--
-- Name: idx_objects_null_version; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX idx_objects_null_version ON storage.objects USING btree (bucket_id, name COLLATE "C") WHERE (NOT is_versioned);


--
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);


--
-- Name: objects_bucket_id_name_version_key; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX objects_bucket_id_name_version_key ON storage.objects USING btree (bucket_id, name COLLATE "C", version) NULLS NOT DISTINCT;


--
-- Name: vector_indexes_name_bucket_id_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX vector_indexes_name_bucket_id_idx ON storage.vector_indexes USING btree (name, bucket_id);


--
-- Name: subscription tr_check_filters; Type: TRIGGER; Schema: realtime; Owner: -
--

CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters();


--
-- Name: buckets enforce_bucket_name_length_trigger; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();


--
-- Name: buckets protect_bucket_control_insert; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER protect_bucket_control_insert BEFORE INSERT ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.protect_bucket_control_columns('service_role');


--
-- Name: buckets protect_bucket_control_update; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER protect_bucket_control_update BEFORE UPDATE OF lifecycle_configuration, lifecycle_configuration_generation ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.protect_bucket_control_columns();


--
-- Name: buckets protect_bucket_control_update_role; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER protect_bucket_control_update_role AFTER UPDATE OF lifecycle_configuration, lifecycle_configuration_generation ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_lifecycle_service_role('service_role');


--
-- Name: buckets protect_buckets_delete; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER protect_buckets_delete BEFORE DELETE ON storage.buckets FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- Name: objects protect_objects_delete; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER protect_objects_delete BEFORE DELETE ON storage.objects FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();


--
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;


--
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mfa_recovery_code_sets mfa_recovery_code_sets_mfa_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_recovery_code_sets
    ADD CONSTRAINT mfa_recovery_code_sets_mfa_factor_id_fkey FOREIGN KEY (mfa_factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;


--
-- Name: mfa_recovery_code_sets mfa_recovery_code_sets_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_recovery_code_sets
    ADD CONSTRAINT mfa_recovery_code_sets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mfa_recovery_codes mfa_recovery_codes_mfa_recovery_code_set_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_recovery_codes
    ADD CONSTRAINT mfa_recovery_codes_mfa_recovery_code_set_id_fkey FOREIGN KEY (mfa_recovery_code_set_id) REFERENCES auth.mfa_recovery_code_sets(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: scim_tokens scim_tokens_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.scim_tokens
    ADD CONSTRAINT scim_tokens_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: scim_users scim_users_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.scim_users
    ADD CONSTRAINT scim_users_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: scim_users scim_users_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.scim_users
    ADD CONSTRAINT scim_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: sessions sessions_oauth_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_oauth_client_id_fkey FOREIGN KEY (oauth_client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: webauthn_challenges webauthn_challenges_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_challenges
    ADD CONSTRAINT webauthn_challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: webauthn_credentials webauthn_credentials_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: accounts_usuario_groups accounts_usuario_gro_usuario_id_8eb16911_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_usuario_groups
    ADD CONSTRAINT accounts_usuario_gro_usuario_id_8eb16911_fk_accounts_ FOREIGN KEY (usuario_id) REFERENCES public.accounts_usuario(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: accounts_usuario_groups accounts_usuario_groups_group_id_81d91a41_fk_auth_group_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_usuario_groups
    ADD CONSTRAINT accounts_usuario_groups_group_id_81d91a41_fk_auth_group_id FOREIGN KEY (group_id) REFERENCES public.auth_group(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: accounts_usuario_user_permissions accounts_usuario_use_permission_id_3de42c14_fk_auth_perm; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_usuario_user_permissions
    ADD CONSTRAINT accounts_usuario_use_permission_id_3de42c14_fk_auth_perm FOREIGN KEY (permission_id) REFERENCES public.auth_permission(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: accounts_usuario_user_permissions accounts_usuario_use_usuario_id_d048ad71_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_usuario_user_permissions
    ADD CONSTRAINT accounts_usuario_use_usuario_id_d048ad71_fk_accounts_ FOREIGN KEY (usuario_id) REFERENCES public.accounts_usuario(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: accounts_vendedor accounts_vendedor_id_revisor_id_d7ac8fb1_fk_accounts_usuario_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_vendedor
    ADD CONSTRAINT accounts_vendedor_id_revisor_id_d7ac8fb1_fk_accounts_usuario_id FOREIGN KEY (id_revisor_id) REFERENCES public.accounts_usuario(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: accounts_vendedor accounts_vendedor_id_usuario_id_503245b8_fk_accounts_usuario_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_vendedor
    ADD CONSTRAINT accounts_vendedor_id_usuario_id_503245b8_fk_accounts_usuario_id FOREIGN KEY (id_usuario_id) REFERENCES public.accounts_usuario(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: addresses_direccion addresses_direccion_id_usuario_id_2f6ad862_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addresses_direccion
    ADD CONSTRAINT addresses_direccion_id_usuario_id_2f6ad862_fk_accounts_ FOREIGN KEY (id_usuario_id) REFERENCES public.accounts_usuario(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: audit_registroauditoria audit_registroaudito_id_usuario_id_2cca3e92_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_registroauditoria
    ADD CONSTRAINT audit_registroaudito_id_usuario_id_2cca3e92_fk_accounts_ FOREIGN KEY (id_usuario_id) REFERENCES public.accounts_usuario(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: auth_group_permissions auth_group_permissio_permission_id_84c5c92e_fk_auth_perm; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_group_permissions
    ADD CONSTRAINT auth_group_permissio_permission_id_84c5c92e_fk_auth_perm FOREIGN KEY (permission_id) REFERENCES public.auth_permission(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: auth_group_permissions auth_group_permissions_group_id_b120cbf9_fk_auth_group_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_group_permissions
    ADD CONSTRAINT auth_group_permissions_group_id_b120cbf9_fk_auth_group_id FOREIGN KEY (group_id) REFERENCES public.auth_group(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: auth_permission auth_permission_content_type_id_2f476e4b_fk_django_co; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_permission
    ADD CONSTRAINT auth_permission_content_type_id_2f476e4b_fk_django_co FOREIGN KEY (content_type_id) REFERENCES public.django_content_type(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: catalog_categoria catalog_categoria_id_categoria_padre_i_56714595_fk_catalog_c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_categoria
    ADD CONSTRAINT catalog_categoria_id_categoria_padre_i_56714595_fk_catalog_c FOREIGN KEY (id_categoria_padre_id) REFERENCES public.catalog_categoria(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: catalog_imagenproducto catalog_imagenproduc_id_producto_id_ffb313ab_fk_catalog_p; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_imagenproducto
    ADD CONSTRAINT catalog_imagenproduc_id_producto_id_ffb313ab_fk_catalog_p FOREIGN KEY (id_producto_id) REFERENCES public.catalog_producto(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: catalog_producto catalog_producto_id_categoria_id_24920292_fk_catalog_c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_producto
    ADD CONSTRAINT catalog_producto_id_categoria_id_24920292_fk_catalog_c FOREIGN KEY (id_categoria_id) REFERENCES public.catalog_categoria(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: catalog_producto catalog_producto_id_puesto_id_73769f19_fk_catalog_puesto_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_producto
    ADD CONSTRAINT catalog_producto_id_puesto_id_73769f19_fk_catalog_puesto_id FOREIGN KEY (id_puesto_id) REFERENCES public.catalog_puesto(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: catalog_puesto catalog_puesto_id_vendedor_id_80607243_fk_accounts_usuario_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_puesto
    ADD CONSTRAINT catalog_puesto_id_vendedor_id_80607243_fk_accounts_usuario_id FOREIGN KEY (id_vendedor_id) REFERENCES public.accounts_usuario(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: catalog_puestocategoria catalog_puestocatego_id_categoria_id_3e0f0a30_fk_catalog_c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_puestocategoria
    ADD CONSTRAINT catalog_puestocatego_id_categoria_id_3e0f0a30_fk_catalog_c FOREIGN KEY (id_categoria_id) REFERENCES public.catalog_categoria(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: catalog_puestocategoria catalog_puestocatego_id_puesto_id_e7fc516e_fk_catalog_p; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_puestocategoria
    ADD CONSTRAINT catalog_puestocatego_id_puesto_id_e7fc516e_fk_catalog_p FOREIGN KEY (id_puesto_id) REFERENCES public.catalog_puesto(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: django_admin_log django_admin_log_content_type_id_c4bce8eb_fk_django_co; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.django_admin_log
    ADD CONSTRAINT django_admin_log_content_type_id_c4bce8eb_fk_django_co FOREIGN KEY (content_type_id) REFERENCES public.django_content_type(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: django_admin_log django_admin_log_user_id_c564eba6_fk_accounts_usuario_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.django_admin_log
    ADD CONSTRAINT django_admin_log_user_id_c564eba6_fk_accounts_usuario_id FOREIGN KEY (user_id) REFERENCES public.accounts_usuario(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: notifications_notificacion notifications_notifi_id_pedido_id_c3dd94f0_fk_orders_pe; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications_notificacion
    ADD CONSTRAINT notifications_notifi_id_pedido_id_c3dd94f0_fk_orders_pe FOREIGN KEY (id_pedido_id) REFERENCES public.orders_pedido(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: notifications_notificacion notifications_notifi_id_usuario_id_4dc24873_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications_notificacion
    ADD CONSTRAINT notifications_notifi_id_usuario_id_4dc24873_fk_accounts_ FOREIGN KEY (id_usuario_id) REFERENCES public.accounts_usuario(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: orders_itempedido orders_itempedido_id_pedido_id_b2f7791a_fk_orders_pedido_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders_itempedido
    ADD CONSTRAINT orders_itempedido_id_pedido_id_b2f7791a_fk_orders_pedido_id FOREIGN KEY (id_pedido_id) REFERENCES public.orders_pedido(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: orders_itempedido orders_itempedido_id_producto_id_72694daa_fk_catalog_p; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders_itempedido
    ADD CONSTRAINT orders_itempedido_id_producto_id_72694daa_fk_catalog_p FOREIGN KEY (id_producto_id) REFERENCES public.catalog_producto(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: orders_pedido orders_pedido_id_comprador_id_606dfd58_fk_accounts_usuario_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders_pedido
    ADD CONSTRAINT orders_pedido_id_comprador_id_606dfd58_fk_accounts_usuario_id FOREIGN KEY (id_comprador_id) REFERENCES public.accounts_usuario(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: orders_pedido orders_pedido_id_cupon_id_b468b5aa_fk_promotions_cupon_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders_pedido
    ADD CONSTRAINT orders_pedido_id_cupon_id_b468b5aa_fk_promotions_cupon_id FOREIGN KEY (id_cupon_id) REFERENCES public.promotions_cupon(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: orders_pedido orders_pedido_id_direccion_id_9ce55aa3_fk_addresses; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders_pedido
    ADD CONSTRAINT orders_pedido_id_direccion_id_9ce55aa3_fk_addresses FOREIGN KEY (id_direccion_id) REFERENCES public.addresses_direccion(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: orders_pedido orders_pedido_id_puesto_id_d8afb9da_fk_catalog_puesto_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders_pedido
    ADD CONSTRAINT orders_pedido_id_puesto_id_d8afb9da_fk_catalog_puesto_id FOREIGN KEY (id_puesto_id) REFERENCES public.catalog_puesto(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: payments_pago payments_pago_id_pedido_id_87ba8513_fk_orders_pedido_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments_pago
    ADD CONSTRAINT payments_pago_id_pedido_id_87ba8513_fk_orders_pedido_id FOREIGN KEY (id_pedido_id) REFERENCES public.orders_pedido(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: promotions_cupon promotions_cupon_id_puesto_id_91fd00c6_fk_catalog_puesto_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotions_cupon
    ADD CONSTRAINT promotions_cupon_id_puesto_id_91fd00c6_fk_catalog_puesto_id FOREIGN KEY (id_puesto_id) REFERENCES public.catalog_puesto(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: promotions_usocupon promotions_usocupon_id_cupon_id_7b21b04d_fk_promotions_cupon_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotions_usocupon
    ADD CONSTRAINT promotions_usocupon_id_cupon_id_7b21b04d_fk_promotions_cupon_id FOREIGN KEY (id_cupon_id) REFERENCES public.promotions_cupon(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: promotions_usocupon promotions_usocupon_id_pedido_id_b64d590f_fk_orders_pedido_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotions_usocupon
    ADD CONSTRAINT promotions_usocupon_id_pedido_id_b64d590f_fk_orders_pedido_id FOREIGN KEY (id_pedido_id) REFERENCES public.orders_pedido(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: promotions_usocupon promotions_usocupon_id_usuario_id_21d30322_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promotions_usocupon
    ADD CONSTRAINT promotions_usocupon_id_usuario_id_21d30322_fk_accounts_ FOREIGN KEY (id_usuario_id) REFERENCES public.accounts_usuario(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: reviews_resena reviews_resena_id_pedido_id_8c14451c_fk_orders_pedido_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews_resena
    ADD CONSTRAINT reviews_resena_id_pedido_id_8c14451c_fk_orders_pedido_id FOREIGN KEY (id_pedido_id) REFERENCES public.orders_pedido(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: reviews_resena reviews_resena_id_puesto_id_aca08df0_fk_catalog_puesto_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews_resena
    ADD CONSTRAINT reviews_resena_id_puesto_id_aca08df0_fk_catalog_puesto_id FOREIGN KEY (id_puesto_id) REFERENCES public.catalog_puesto(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: reviews_resena reviews_resena_id_usuario_id_1e8a725a_fk_accounts_usuario_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews_resena
    ADD CONSTRAINT reviews_resena_id_usuario_id_1e8a725a_fk_accounts_usuario_id FOREIGN KEY (id_usuario_id) REFERENCES public.accounts_usuario(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: token_blacklist_blacklistedtoken token_blacklist_blacklistedtoken_token_id_3cc7fe56_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.token_blacklist_blacklistedtoken
    ADD CONSTRAINT token_blacklist_blacklistedtoken_token_id_3cc7fe56_fk FOREIGN KEY (token_id) REFERENCES public.token_blacklist_outstandingtoken(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: token_blacklist_outstandingtoken token_blacklist_outs_user_id_83bc629a_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.token_blacklist_outstandingtoken
    ADD CONSTRAINT token_blacklist_outs_user_id_83bc629a_fk_accounts_ FOREIGN KEY (user_id) REFERENCES public.accounts_usuario(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;


--
-- Name: vector_indexes vector_indexes_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets_vectors(id);


--
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.audit_log_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.flow_state ENABLE ROW LEVEL SECURITY;

--
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;

--
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.instances ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_amr_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_factors ENABLE ROW LEVEL SECURITY;

--
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.one_time_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_relay_states ENABLE ROW LEVEL SECURITY;

--
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.schema_migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_domains ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

--
-- Name: accounts_usuario; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.accounts_usuario ENABLE ROW LEVEL SECURITY;

--
-- Name: accounts_usuario_groups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.accounts_usuario_groups ENABLE ROW LEVEL SECURITY;

--
-- Name: accounts_usuario_user_permissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.accounts_usuario_user_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: accounts_vendedor; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.accounts_vendedor ENABLE ROW LEVEL SECURITY;

--
-- Name: addresses_direccion; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.addresses_direccion ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_registroauditoria; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_registroauditoria ENABLE ROW LEVEL SECURITY;

--
-- Name: auth_group; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.auth_group ENABLE ROW LEVEL SECURITY;

--
-- Name: auth_group_permissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.auth_group_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: auth_permission; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.auth_permission ENABLE ROW LEVEL SECURITY;

--
-- Name: catalog_categoria; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.catalog_categoria ENABLE ROW LEVEL SECURITY;

--
-- Name: catalog_imagenproducto; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.catalog_imagenproducto ENABLE ROW LEVEL SECURITY;

--
-- Name: catalog_producto; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.catalog_producto ENABLE ROW LEVEL SECURITY;

--
-- Name: catalog_puesto; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.catalog_puesto ENABLE ROW LEVEL SECURITY;

--
-- Name: catalog_puestocategoria; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.catalog_puestocategoria ENABLE ROW LEVEL SECURITY;

--
-- Name: django_admin_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.django_admin_log ENABLE ROW LEVEL SECURITY;

--
-- Name: django_content_type; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.django_content_type ENABLE ROW LEVEL SECURITY;

--
-- Name: django_migrations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.django_migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: django_session; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.django_session ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications_notificacion; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications_notificacion ENABLE ROW LEVEL SECURITY;

--
-- Name: orders_itempedido; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orders_itempedido ENABLE ROW LEVEL SECURITY;

--
-- Name: orders_pedido; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orders_pedido ENABLE ROW LEVEL SECURITY;

--
-- Name: payments_pago; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payments_pago ENABLE ROW LEVEL SECURITY;

--
-- Name: promotions_cupon; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.promotions_cupon ENABLE ROW LEVEL SECURITY;

--
-- Name: promotions_usocupon; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.promotions_usocupon ENABLE ROW LEVEL SECURITY;

--
-- Name: reviews_resena; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reviews_resena ENABLE ROW LEVEL SECURITY;

--
-- Name: token_blacklist_blacklistedtoken; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.token_blacklist_blacklistedtoken ENABLE ROW LEVEL SECURITY;

--
-- Name: token_blacklist_outstandingtoken; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.token_blacklist_outstandingtoken ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: realtime; Owner: -
--

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_analytics; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_vectors; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets_vectors ENABLE ROW LEVEL SECURITY;

--
-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads_parts; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads_parts ENABLE ROW LEVEL SECURITY;

--
-- Name: vector_indexes; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.vector_indexes ENABLE ROW LEVEL SECURITY;

--
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: -
--

CREATE PUBLICATION supabase_realtime WITH (publish = 'insert, update, delete, truncate');


--
-- Name: ensure_rls; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER ensure_rls ON ddl_command_end
         WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
   EXECUTE FUNCTION public.rls_auto_enable();


--
-- Name: issue_graphql_placeholder; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_graphql_placeholder ON sql_drop
         WHEN TAG IN ('DROP EXTENSION')
   EXECUTE FUNCTION extensions.set_graphql_placeholder();


--
-- Name: issue_pg_cron_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_cron_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_cron_access();


--
-- Name: issue_pg_graphql_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_graphql_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_graphql_access();


--
-- Name: issue_pg_net_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_net_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_net_access();


--
-- Name: pgrst_ddl_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_ddl_watch ON ddl_command_end
   EXECUTE FUNCTION extensions.pgrst_ddl_watch();


--
-- Name: pgrst_drop_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_drop_watch ON sql_drop
   EXECUTE FUNCTION extensions.pgrst_drop_watch();


--
-- PostgreSQL database dump complete
--

\unrestrict 6jp16m6hDPhQ2YzC1EeTHu399KSby6VFG7dpCiSZXHZ4Kjkfo8fYaALV6rVlK4X

