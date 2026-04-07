# Credit cards and transfers

This document describes how **credit card accounts**, **“amount due” (fatura)**, and **transfers** work in the MVP.

## Transfer (`type: transfer`)

- A transfer is **one stored transaction** that moves money between two accounts.
- Fields: `fromAccountId`, `toAccountId`, `amountCents` (always positive), `date`, optional `description`.
- `accountId` is set to `fromAccountId` for indexing and compatibility with older queries.
- **Balances:** the origin account decreases by `amountCents`; the destination increases by the same amount.
- **Monthly summary (Receitas / Despesas / Resultado):** transfers are **excluded**. They are not income or expense; they only move value between pockets.
- **“Saldo no período”** in the filtered list:
  - With **all accounts** selected, transfers contribute **0** (no double-counting of wealth).
  - With a **single account** selected, a transfer counts as **−amount** if that account is the origin and **+amount** if it is the destination.

You can create transfers from **Nova transação → Transferência** or via **Pagar fatura** on a credit card (see below).

## Credit card account (`AccountType: credit_card`)

- Create a normal account and set type **Cartão de crédito**.
- **Card purchases:** record **Despesa** with the **card** as the account (same as any other expense).

### “A pagar” / fatura label (MVP)

- The card row shows **Fatura** plus the **name of the current calendar month** (the month of “today”), not the month selected in the transaction list filter.
- **A pagar** for that card in that **calendar month** is:

  `sum(expenses on the card in that month) − sum(transfers whose destination is that card in that month)`

  - Only **normal** expenses count (not `opening_balance`).
  - Transfers **into** the card reduce “a pagar” (they represent paying the bill from the app’s point of view).

- Values are **never negative** in the UI; if payments exceed expenses in the month, **A pagar** shows **R$ 0,00**.

### Saldo (contábil)

- **Saldo (contábil)** on the card is the same **running balance** as for other accounts: all transaction types (including transfers and opening balance) using the shared balance rules.

### Pagar fatura

- **Pagar fatura** opens a short form: **account to debit** (usually a bank account), **amount**, **date**.
- Submitting creates a **transfer** from the chosen account **to** the card, with description:

  `Pagamento fatura — <card name> (<month label of current calendar month>)`

- This matches the habit of paying on the 1st while keeping the label tied to the **payment month** in Portuguese (e.g. “janeiro de 2026”).

## Limits and future improvements

- There is **no** per-card **closing day** or custom statement window yet; the MVP uses **calendar month** for “a pagar”.
- There is **no** credit limit field; optional workarounds (e.g. opening balance) are unchanged.
- **Linked transfer pairs** (two rows) are not used: one `transfer` row is the source of truth.

## IndexedDB

- Schema version **3** adds optional indexes `fromAccountId` and `toAccountId` on `transactions`.
