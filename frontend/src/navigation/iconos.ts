import {
  BadgeCheck,
  Bell,
  BookOpenCheck,
  Circle,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  LogIn,
  MapPin,
  Package,
  Percent,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Star,
  Store,
  Tags,
  Ticket,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';

const ICONOS: Record<string, LucideIcon> = {
  BadgeCheck,
  Bell,
  BookOpenCheck,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  LogIn,
  MapPin,
  Package,
  Percent,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Star,
  Store,
  Tags,
  Ticket,
  User,
  Users,
};

export function iconoDe(nombre: string | null | undefined): LucideIcon {
  return (nombre && ICONOS[nombre]) || Circle;
}
