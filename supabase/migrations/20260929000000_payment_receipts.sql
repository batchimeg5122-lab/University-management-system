-- =====================================================================
-- ИХ ЗАСАГ — Төлбөр төлсөн баримт (receipt)
--   payments.receipt_no : баримтын дугаар (RCP-YYYY-00001), давхардахгүй
-- Оюутан, санхүү хоёулаа PDF баримт татаж, хэвлэж болно.
-- Давтан ажиллуулахад аюулгүй (idempotent).
-- =====================================================================

begin;

alter table public.payments add column if not exists receipt_no text;

-- Өмнө бүртгэгдсэн төлөлтүүдэд дугаар нөхөж олгоно (төлсөн огнооны дарааллаар)
with numbered as (
  select
    id,
    'RCP-' || to_char(coalesce(payment_date, created_at, now()), 'YYYY') || '-' ||
      lpad(row_number() over (
        partition by to_char(coalesce(payment_date, created_at, now()), 'YYYY')
        order by coalesce(payment_date, created_at, now()), id
      )::text, 5, '0') as generated
  from public.payments
  where receipt_no is null
)
update public.payments p
set receipt_no = n.generated
from numbered n
where p.id = n.id;

create unique index if not exists payments_receipt_no_key on public.payments(receipt_no) where receipt_no is not null;

commit;
