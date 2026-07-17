"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Banknote,
  CalendarClock,
  ClipboardList,
  CreditCard,
  FileText,
  Loader2,
  Package,
  Receipt,
  ShoppingCart,
  User,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { apiFetch, apiFetchList } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

type Sale = {
  id: number;
  custom_id?: string;
  number?: string;
  patient?: number | { id?: number; name?: string; custom_id?: string };
  patient_name?: string;
  total?: string | number;
  created_at?: string;
  updated_at?: string;
};

type Product = {
  id: number;
  custom_id?: string;
  name?: string;
  type?: "MED" | "MAT" | "OUT" | string;
};

type SaleItem = {
  id: number;
  custom_id?: string;
  sale?: number | { id?: number };
  product?: number | (Product & { id?: number });
  product_name?: string;
  quantity?: number;
  unit_price?: string | number;
  total_linha?: string | number;
  created_at?: string;
};

type Patient = {
  id: number;
  custom_id?: string;
  name?: string;
  full_name?: string;
  nome?: string;
};

type SaleInvoice = {
  id: number;
  custom_id?: string;
  status?: string;
  total?: string | number;
};

type SaleReceipt = {
  id: number;
  number?: string;
  value?: string | number;
  invoice?: number;
};

type SaleBillingStatus = {
  invoice?: SaleInvoice | null;
  receipt?: SaleReceipt | null;
  paid?: boolean;
};

const PAYMENT_METHODS = [
  { value: "DIN", label: "Dinheiro" },
  { value: "CAR", label: "Cartão" },
  { value: "TRF", label: "Transferência" },
  { value: "MOB", label: "Mobile Money" },
  { value: "POS", label: "POS" },
  { value: "SEG", label: "Seguro de saúde" },
  { value: "CHQ", label: "Cheque" },
  { value: "OUT", label: "Outro" },
] as const;

type PaymentMethod = (typeof PAYMENT_METHODS)[number]["value"];

const GLASS =
  "rounded-lg border border-white/20 bg-white/35 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

function saleCode(sale?: Sale | null) {
  return sale?.number || sale?.custom_id || (sale ? `Venda #${sale.id}` : "Venda");
}

function patientId(sale?: Sale | null) {
  if (!sale) return "";
  if (typeof sale.patient === "object" && sale.patient) return sale.patient.id ? String(sale.patient.id) : "";
  return sale.patient ? String(sale.patient) : "";
}

function patientLabel(sale?: Sale | null, patient?: Patient | null) {
  if (!sale) return "—";
  if (sale.patient_name) return sale.patient_name;
  if (typeof sale.patient === "object" && sale.patient) return sale.patient.name || sale.patient.custom_id || `Paciente ${sale.patient.id}`;
  return patient?.name || patient?.full_name || patient?.nome || patient?.custom_id || (patientId(sale) ? `Paciente #${patientId(sale)}` : "Sem paciente");
}

function productId(item: SaleItem) {
  if (typeof item.product === "object" && item.product) return item.product.id ? String(item.product.id) : "";
  return item.product ? String(item.product) : "";
}

function productLabel(item: SaleItem, products?: Map<string, Product>) {
  if (item.product_name) return item.product_name;
  if (typeof item.product === "object" && item.product) return item.product.name || item.product.custom_id || `Produto ${item.product.id}`;
  const id = productId(item);
  const product = id ? products?.get(id) : null;
  return product?.name || product?.custom_id || (id ? `Produto #${id}` : "Produto não informado");
}

function productType(item: SaleItem, products?: Map<string, Product>) {
  if (typeof item.product === "object" && item.product?.type) return item.product.type;
  const id = productId(item);
  return id ? products?.get(id)?.type : undefined;
}

function itemKindLabel(item: SaleItem, products: Map<string, Product>) {
  const type = productType(item, products);
  if (type === "MED") return "Medicação";
  if (type === "MAT") return "Material";
  return "Item";
}

function saleItemSaleId(item: SaleItem) {
  if (typeof item.sale === "object" && item.sale) return item.sale.id ? String(item.sale.id) : "";
  return item.sale ? String(item.sale) : "";
}

function formatMoney(value?: string | number) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 }).format(amount);
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function lineTotal(item: SaleItem) {
  if (item.total_linha !== undefined && item.total_linha !== null) return Number(item.total_linha);
  return Number(item.quantity || 0) * Number(item.unit_price || 0);
}

function parseMoneyToCents(value: unknown) {
  if (value === undefined || value === null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value * 100);
  const raw = String(value).trim();
  if (!raw) return null;
  let normalized = raw.replace(/\s+/g, "").replace(/[^\d,.-]/g, "");
  if (normalized.includes(",") && normalized.includes(".")) normalized = normalized.replace(/\./g, "").replace(",", ".");
  else if (normalized.includes(",")) normalized = normalized.replace(",", ".");
  const parts = normalized.split(".");
  if (parts.length > 2) normalized = `${parts.slice(0, -1).join("")}.${parts[parts.length - 1]}`;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : null;
}

function centsToMoney(cents: number) {
  return (cents / 100).toFixed(2);
}

function MetricCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/45 px-3 py-1.5">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        <Icon size={11} />
        {label}
      </div>
      <div className="truncate text-sm font-bold text-foreground">{value ?? "—"}</div>
    </div>
  );
}

function ItemCard({ item, products }: { item: SaleItem; products: Map<string, Product> }) {
  return (
    <Link href={`/pharmacy/sale-items/${item.id}`} className={`${GLASS} group relative block overflow-hidden transition hover:shadow-md`}>
      <span className="absolute inset-y-0 left-0 w-1 bg-green-500" />
      <div className="space-y-2 px-3 py-2 pl-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-500/12 text-green-600 dark:text-green-300">
              <Package size={15} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground group-hover:text-cyan-600 dark:group-hover:text-cyan-300">
                {productLabel(item, products)}
              </p>
              <p className="truncate text-[10px] text-muted-foreground">{item.custom_id || `Item #${item.id}`}</p>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:border-green-800/50 dark:bg-green-950/30 dark:text-green-300">
            {itemKindLabel(item, products)}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1.5 text-[11px]">
          <div className="rounded-md border border-border/60 bg-background/45 px-2 py-1">
            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Qtd.</p>
            <p className="truncate text-xs font-bold text-foreground">{item.quantity ?? 0}</p>
          </div>
          <div className="rounded-md border border-border/60 bg-background/45 px-2 py-1">
            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Unitário</p>
            <p className="truncate text-xs font-semibold text-foreground">{formatMoney(item.unit_price)}</p>
          </div>
          <div className="rounded-md border border-border/60 bg-background/45 px-2 py-1">
            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Subtotal</p>
            <p className="truncate text-xs font-semibold text-foreground">{formatMoney(lineTotal(item))}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function SalesDetailPage() {
  useAuthGuard();
  const params = useParams();
  const safeRefreshToken = useSafeDataRefreshSignal();
  const id = String((params as any)?.id || "");

  const [sale, setSale] = useState<Sale | null>(null);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<"invoice" | "payment" | "receipt" | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<SaleInvoice | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentValues, setPaymentValues] = useState<Record<PaymentMethod, string>>({
    DIN: "",
    CAR: "",
    TRF: "",
    MOB: "",
    POS: "",
    SEG: "",
    CHQ: "",
    OUT: "",
  });
  const [insurers, setInsurers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [insurerId, setInsurerId] = useState("");
  const [planId, setPlanId] = useState("");
  const [authorizationNumber, setAuthorizationNumber] = useState("");
  const [paymentFeedback, setPaymentFeedback] = useState<string | null>(null);
  const [invoicePaid, setInvoicePaid] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const saleResponse = await apiFetch<Sale>(`/pharmacy/sale/${id}/`, { clientCache: safeRefreshToken === 0 });
        const [itemsResponse, patientResponse, productsResponse, billingResponse] = await Promise.all([
          apiFetchList<SaleItem>("/pharmacy/sale_item/", {
            page: 1,
            pageSize: 500,
            query: { sale: id },
            clientPaginate: true,
            clientCache: safeRefreshToken === 0,
          }),
          patientId(saleResponse)
            ? apiFetch<Patient>(`/clinical/patients/${patientId(saleResponse)}/`, { clientCache: safeRefreshToken === 0 }).catch(() => null)
            : Promise.resolve(null),
          apiFetchList<Product>("/pharmacy/product/", {
            page: 1,
            pageSize: 500,
            clientPaginate: true,
            clientCache: safeRefreshToken === 0,
          }).catch(() => ({ items: [] as Product[], meta: {}, raw: null })),
          apiFetch<SaleBillingStatus>(`/pharmacy/sale/${id}/billing-status/`, {
            clientCache: safeRefreshToken === 0,
          }).catch(() => ({ invoice: null, receipt: null, paid: false })),
        ]);
        if (!mounted) return;
        setSale(saleResponse);
        setItems((itemsResponse.items ?? []).filter((item) => saleItemSaleId(item) === id));
        setPatient(patientResponse);
        setProducts(productsResponse.items ?? []);
        const invoice = billingResponse.invoice ?? null;
        setPaymentInvoice(invoice);
        setInvoicePaid(Boolean(billingResponse.paid || billingResponse.receipt || invoice?.status === "PAGA"));
      } catch (err: any) {
        if (mounted) setError(err?.message || "Falha ao carregar venda.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [id, safeRefreshToken]);

  const itemsTotal = useMemo(() => items.reduce((total, item) => total + lineTotal(item), 0), [items]);
  const productsMap = useMemo(() => new Map(products.map((product) => [String(product.id), product])), [products]);
  const quantityTotal = items.reduce((total, item) => total + Number(item.quantity || 0), 0);
  const paymentTotalCents = parseMoneyToCents(paymentInvoice?.total) || 0;
  const informedTotalCents = paymentMethods.reduce((total, method) => total + (parseMoneyToCents(paymentValues[method]) || 0), 0);
  const changeCents = Math.max(informedTotalCents - paymentTotalCents, 0);
  const netTotalCents = informedTotalCents - changeCents;
  const missingCents = Math.max(paymentTotalCents - informedTotalCents, 0);
  const selectedPlans = plans.filter((plan) => String(plan.seguradora ?? plan.insurer ?? "") === insurerId);

  async function downloadBlob(endpoint: string, filename: string) {
    const blob = await apiFetch<Blob>(endpoint, { method: "GET", responseType: "blob" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  async function generateInvoice() {
    if (!id || action) return;
    try {
      setAction("invoice");
      setError(null);
      const invoice = await apiFetch<SaleInvoice>(`/pharmacy/sale/${id}/generate-invoice/`, { method: "POST" });
      await downloadBlob(`/invoices/${invoice.id}/pdf/`, `fatura_${invoice.custom_id || invoice.id}.pdf`);
    } catch (err: any) {
      setError(err?.message || "Falha ao gerar fatura.");
    } finally {
      setAction(null);
    }
  }

  async function payInvoice() {
    if (!id || action) return;
    try {
      setAction("payment");
      setError(null);
      const invoice = await apiFetch<SaleInvoice>(`/pharmacy/sale/${id}/generate-invoice/`, { method: "POST" });
      setPaymentInvoice(invoice);
      setInvoicePaid(invoice.status === "PAGA");
      if (invoice.status === "PAGA") {
        setPaymentFeedback("Fatura já paga. O recibo já pode ser gerado.");
        return;
      }
      setPaymentOpen(true);
      setPaymentFeedback(null);
      if (!paymentMethods.length) {
        setPaymentMethods(["DIN"]);
        setPaymentValues((previous) => ({ ...previous, DIN: String(invoice.total || "") }));
      }
    } catch (err: any) {
      setError(err?.message || "Falha ao abrir pagamento da fatura.");
    } finally {
      setAction(null);
    }
  }

  async function loadInsuranceCatalogs() {
    if (insurers.length || plans.length) return;
    const [insurersResponse, plansResponse] = await Promise.all([
      apiFetch<any>("/insurer/insurer/").catch(() => []),
      apiFetch<any>("/insurer/coverage_plan/").catch(() => []),
    ]);
    setInsurers(Array.isArray(insurersResponse) ? insurersResponse : insurersResponse?.results || []);
    setPlans(Array.isArray(plansResponse) ? plansResponse : plansResponse?.results || []);
  }

  function togglePaymentMethod(method: PaymentMethod, checked: boolean) {
    setPaymentMethods((current) => {
      if (checked) return current.includes(method) ? current : [...current, method];
      return current.filter((item) => item !== method);
    });
    if (!checked) setPaymentValues((previous) => ({ ...previous, [method]: "" }));
    if (method === "SEG" && checked) void loadInsuranceCatalogs();
  }

  async function confirmPayment() {
    if (!paymentInvoice || action) return;
    if (!paymentMethods.length) {
      setError("Selecione pelo menos um método de pagamento.");
      return;
    }
    const invalid = paymentMethods.find((method) => {
      const cents = parseMoneyToCents(paymentValues[method]);
      return typeof cents !== "number" || cents <= 0;
    });
    if (invalid) {
      setError(`Informe um valor válido para ${PAYMENT_METHODS.find((method) => method.value === invalid)?.label || invalid}.`);
      return;
    }
    if (netTotalCents !== paymentTotalCents) {
      setError("O valor líquido do pagamento deve ser exatamente o total da fatura.");
      return;
    }
    if (paymentMethods.includes("SEG") && (!insurerId || !authorizationNumber.trim())) {
      setError("Preencha a seguradora e o número de autorização do seguro.");
      return;
    }

    try {
      setAction("payment");
      setError(null);
      setPaymentFeedback(null);
      let remainingChange = changeCents;
      const sortedMethods = [...paymentMethods].sort((a, b) => (a === "DIN" ? 0 : 1) - (b === "DIN" ? 0 : 1));
      const changeByMethod = new Map<PaymentMethod, number>();
      sortedMethods.forEach((method) => {
        if (remainingChange <= 0) return;
        const value = parseMoneyToCents(paymentValues[method]) || 0;
        const change = Math.min(value, remainingChange);
        if (change > 0) {
          changeByMethod.set(method, change);
          remainingChange -= change;
        }
      });

      for (const method of paymentMethods) {
        const cents = parseMoneyToCents(paymentValues[method]) || 0;
        const payload: Record<string, unknown> = {
          fatura: paymentInvoice.id,
          nome: `Pagamento ${paymentInvoice.custom_id || paymentInvoice.id} · ${PAYMENT_METHODS.find((item) => item.value === method)?.label || method}`,
          valor: centsToMoney(cents),
          metodo: method,
          status: "CON",
        };
        const methodChange = changeByMethod.get(method) || 0;
        if (methodChange > 0) payload.troco = centsToMoney(methodChange);
        if (method === "SEG") {
          payload.seguradora = Number(insurerId);
          if (planId) payload.plano_cobertura = Number(planId);
          payload.numero_autorizacao = authorizationNumber.trim();
        }
        await apiFetch("/payments/payment/", { method: "POST", body: JSON.stringify(payload) });
      }

      setPaymentFeedback("Pagamento confirmado. O recibo já pode ser gerado.");
      setPaymentOpen(false);
      setInvoicePaid(true);
    } catch (err: any) {
      setError(err?.message || "Falha ao confirmar pagamento.");
    } finally {
      setAction(null);
    }
  }

  async function generateReceipt() {
    if (!id || action) return;
    try {
      setAction("receipt");
      setError(null);
      const receipt = await apiFetch<SaleReceipt>(`/pharmacy/sale/${id}/generate-receipt/`, { method: "POST" });
      await downloadBlob(`/payments/receipt/${receipt.id}/pdf/`, `recibo_${receipt.number || receipt.id}.pdf`);
    } catch (err: any) {
      setError(err?.message || "Falha ao gerar recibo.");
    } finally {
      setAction(null);
    }
  }

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.FARMACIA]}>
      <div className="w-full space-y-2 px-1">
        <section className={`${GLASS} relative overflow-hidden`}>
          <span className="absolute inset-y-0 left-0 w-1 bg-green-500" />
          <div className="space-y-2 px-3 py-2 pl-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-500/12 text-green-600 dark:text-green-300">
                  <ShoppingCart size={18} />
                </span>
                <div className="min-w-0">
                  <h1 className="truncate text-base font-bold leading-tight text-foreground">
                    {loading ? "Venda..." : saleCode(sale)}
                  </h1>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:border-green-800/50 dark:bg-green-950/30 dark:text-green-300">
                      Venda
                    </span>
                    <span className="text-[11px] text-muted-foreground">{patientLabel(sale, patient)}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <Link href="/pharmacy/sales" className="inline-flex h-8 items-center gap-1 rounded-md border border-border/70 bg-background/60 px-2.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground">
                  <ArrowLeft size={13} />
                  Voltar
                </Link>
                <button
                  type="button"
                  onClick={generateInvoice}
                  disabled={!sale || loading || action !== null}
                  className="inline-flex h-8 items-center gap-1 rounded-md bg-emerald-600 px-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {action === "invoice" ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
                  Gerar fatura
                </button>
                {!invoicePaid ? (
                  <button
                    type="button"
                    onClick={payInvoice}
                    disabled={!sale || loading || action !== null}
                    className="inline-flex h-8 items-center gap-1 rounded-md bg-violet-600 px-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {action === "payment" ? <Loader2 size={13} className="animate-spin" /> : <CreditCard size={13} />}
                    Pagar fatura
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={generateReceipt}
                  disabled={!sale || loading || action !== null}
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-cyan-500/40 bg-cyan-500/12 px-2.5 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-500/18 disabled:cursor-not-allowed disabled:opacity-60 dark:text-cyan-200"
                >
                  {action === "receipt" ? <Loader2 size={13} className="animate-spin" /> : <Receipt size={13} />}
                  Gerar recibo
                </button>
              </div>
            </div>

            {sale ? (
              <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
                <MetricCard icon={Banknote} label="Total venda" value={formatMoney(sale.total)} />
                <MetricCard icon={Receipt} label="Total itens" value={formatMoney(itemsTotal)} />
                <MetricCard icon={Package} label="Itens" value={items.length} />
                <MetricCard icon={CalendarClock} label="Criada em" value={formatDate(sale.created_at)} />
              </div>
            ) : null}
          </div>
        </section>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        ) : null}

        {paymentFeedback ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300">
            {paymentFeedback}
          </div>
        ) : null}

        {paymentOpen && paymentInvoice ? (
          <section className={`${GLASS} relative overflow-visible border-l-4 border-l-violet-500`}>
            <div className="space-y-3 px-3 py-2 pl-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-foreground">Pagar fatura</h2>
                  <p className="text-[11px] text-muted-foreground">
                    {paymentInvoice.custom_id || `Fatura #${paymentInvoice.id}`} · Total {formatMoney(paymentInvoice.total)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPaymentOpen(false)}
                  className="inline-flex h-8 items-center rounded-md border border-border/70 bg-background/60 px-2.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
                >
                  Fechar
                </button>
              </div>

              <div>
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Métodos</p>
                <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
                  {PAYMENT_METHODS.map((method) => (
                    <label key={method.value} className="inline-flex h-9 items-center gap-2 rounded-md border border-border/60 bg-background/50 px-2 text-xs font-semibold text-foreground">
                      <input
                        type="checkbox"
                        checked={paymentMethods.includes(method.value)}
                        onChange={(event) => togglePaymentMethod(method.value, event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      {method.label}
                    </label>
                  ))}
                </div>
              </div>

              {paymentMethods.length ? (
                <div className="grid gap-2 md:grid-cols-3">
                  {paymentMethods.map((method) => (
                    <label key={method} className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                        {PAYMENT_METHODS.find((item) => item.value === method)?.label || method} · Valor
                      </span>
                      <input
                        value={paymentValues[method]}
                        onChange={(event) => setPaymentValues((previous) => ({ ...previous, [method]: event.target.value }))}
                        placeholder="0.00"
                        className="h-9 w-full rounded-md border border-border/70 bg-background/70 px-2 text-sm outline-none focus:border-violet-500"
                      />
                    </label>
                  ))}
                </div>
              ) : null}

              {paymentMethods.includes("SEG") ? (
                <div className="grid gap-2 md:grid-cols-3">
                  <label className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Seguradora</span>
                    <select
                      value={insurerId}
                      onChange={(event) => setInsurerId(event.target.value)}
                      className="h-9 w-full rounded-md border border-border/70 bg-background/70 px-2 text-sm outline-none focus:border-violet-500"
                    >
                      <option value="">Selecione</option>
                      {insurers.map((insurer) => (
                        <option key={insurer.id} value={String(insurer.id)}>
                          {insurer.nome || insurer.name || insurer.id_custom || `Seguradora ${insurer.id}`}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Plano</span>
                    <select
                      value={planId}
                      onChange={(event) => setPlanId(event.target.value)}
                      className="h-9 w-full rounded-md border border-border/70 bg-background/70 px-2 text-sm outline-none focus:border-violet-500"
                    >
                      <option value="">Opcional</option>
                      {selectedPlans.map((plan) => (
                        <option key={plan.id} value={String(plan.id)}>
                          {plan.nome || plan.name || plan.id_custom || `Plano ${plan.id}`}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Autorização</span>
                    <input
                      value={authorizationNumber}
                      onChange={(event) => setAuthorizationNumber(event.target.value)}
                      placeholder="Número de autorização"
                      className="h-9 w-full rounded-md border border-border/70 bg-background/70 px-2 text-sm outline-none focus:border-violet-500"
                    />
                  </label>
                </div>
              ) : null}

              <div className="grid gap-1.5 rounded-lg border border-border/60 bg-background/45 p-2 text-xs md:grid-cols-4">
                <MetricCard icon={Banknote} label="A pagar" value={formatMoney(paymentInvoice.total)} />
                <MetricCard icon={CreditCard} label="Informado" value={formatMoney(informedTotalCents / 100)} />
                <MetricCard icon={Receipt} label="Troco" value={formatMoney(changeCents / 100)} />
                <MetricCard icon={ClipboardList} label="Falta" value={formatMoney(missingCents / 100)} />
              </div>

              <button
                type="button"
                onClick={confirmPayment}
                disabled={action !== null || !paymentMethods.length || netTotalCents !== paymentTotalCents}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {action === "payment" ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                Confirmar pagamento
              </button>
            </div>
          </section>
        ) : null}

        {loading ? (
          <div className={`${GLASS} flex h-40 items-center justify-center text-muted-foreground`}>
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : sale ? (
          <>
            <section className={`${GLASS} relative overflow-hidden`}>
              <span className="absolute inset-y-0 left-0 w-1 bg-cyan-500" />
              <div className="grid grid-cols-1 gap-2 px-3 py-2 pl-4 md:grid-cols-4">
                <MetricCard icon={User} label="Paciente" value={patientLabel(sale, patient)} />
                <MetricCard icon={ClipboardList} label="Código" value={sale.custom_id || sale.number || `#${sale.id}`} />
                <MetricCard icon={Package} label="Qtd. vendida" value={quantityTotal} />
                <MetricCard icon={CalendarClock} label="Actualizada em" value={formatDate(sale.updated_at)} />
              </div>
            </section>

            <section className={`${GLASS} relative overflow-hidden`}>
              <span className="absolute inset-y-0 left-0 w-1 bg-green-500" />
              <div className="space-y-2 px-3 py-2 pl-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-green-500/10 text-green-600 dark:text-green-300">
                    <Package size={14} />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-foreground">Itens da venda</h2>
                    <p className="text-[11px] text-muted-foreground">{items.length} itens ligados a esta venda</p>
                  </div>
                </div>

                {items.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/60 py-8 text-center text-sm text-muted-foreground">
                    Nenhum item encontrado para esta venda.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
                    {items.map((item) => (
                      <ItemCard key={item.id} item={item} products={productsMap} />
                    ))}
                  </div>
                )}
              </div>
            </section>
          </>
        ) : (
          <section className={`${GLASS} flex h-40 items-center justify-center text-sm text-muted-foreground`}>
            Venda não encontrada.
          </section>
        )}
      </div>
    </AppLayout>
  );
}
