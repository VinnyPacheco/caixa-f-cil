## Visão geral

Lançamentos vinculados a contas do tipo **Cartão de Crédito** continuam aparecendo na lista de Transações, mas deixam de impactar saldos e cards de saldo corrido. No lugar, uma **fatura virtual** é gerada automaticamente todo mês na conta de débito do cartão, no dia de vencimento, somando todos os lançamentos do ciclo de fechamento.

## 1. Banco de dados

Migration para adicionar coluna na tabela `accounts`:
- `credit_card_debit_account_id uuid` — FK para `accounts.id`, obrigatória quando `type = 'credit_card'` (validação no app; sem CHECK constraint).

Nenhum schema novo de tabela é necessário. As faturas são **virtuais** (computadas em runtime), evitando dessincronia quando lançamentos do cartão mudam.

## 2. Tipos & serviços

- `Account` ganha `creditCardDebitAccountId?: string | null`.
- `accountsService.ts`: mapear o novo campo em `dbToAccount`/`accountToDb`/`updateAccount`.
- Novo arquivo `src/lib/creditCard.ts`:
  - `getInvoiceCycle(cc: Account, date: Date)` → retorna `{ invoiceYear, invoiceMonth, dueDate }` baseado em `statementClosingDay` e `dueDay`. Regra: lançamentos com data `<=` fechamento entram na fatura que vence no mesmo mês; após o fechamento vão para a do mês seguinte.
  - `buildInvoiceTransactions(transactions, accounts, monthRange)` → para cada cartão e cada ciclo cuja `dueDate` cai no intervalo, gera um `Transaction` virtual: `id = 'invoice:{ccId}:{YYYY-MM}'`, `accountId = debitAccountId`, `type = 'expense'`, `amount = soma do ciclo`, `date = dueDate`, `description = 'Fatura {nome do cartão}'`, `isPaid = false` (com persistência opcional via localStorage, fora deste escopo inicial), flag interna `isCreditCardInvoice = true` e `creditCardId`.

## 3. Integração com listagens e saldos

Em `useTransactions.ts` e `useMultiMonthTransactions.ts`:
- Separar transações reais em **CC-txs** (account é cartão de crédito) e **non-CC-txs**.
- Para cálculo de `openingBalance`, `monthSummary` e `runningBalance`: usar somente non-CC-txs **+ faturas virtuais** geradas pelos cartões.
- Para exibição no `TransactionList`: continuar mostrando todas as transações (CC e non-CC) + as faturas virtuais. Itens de CC ganham um indicador visual (chip "Cartão") e **não exibem coluna de saldo corrido** — o saldo da linha fica em branco para eles.
- `initialBalance` do cartão deixa de entrar no `openingBalance` geral (cartão é passivo, não compõe caixa).

## 4. UI

- `AccountForm.tsx`: novo `<Select>` "Conta para débito da fatura" (obrigatório, exibido apenas quando `type = credit_card`, lista contas não-cartão).
- `TransactionItem.tsx`: badge "Cartão" para CC-txs; estilo destacado (ícone material `credit_card` na cor do cartão) para faturas virtuais; clique em fatura abre modal.
- Novo `InvoiceDetailsDialog.tsx`: modal listando todos os lançamentos do ciclo, com total e botões "Ver página completa" e fechar.
- Nova página `src/pages/CreditCardInvoices.tsx` em `/cartoes/:accountId`: header com nome do cartão, seletor de mês, lista do ciclo, totais (atual, próximo, limite disponível). Linkada a partir da página `Accounts` (botão "Ver faturas" em cards de cartão).
- `TransactionForm.tsx`: ao selecionar conta cartão, exibir nota informativa "Este lançamento entrará na fatura de {MM/YYYY}".

## 5. Edge cases

- Edição/exclusão de fatura virtual: bloqueada (não é uma row real). Toast "Edite os lançamentos do cartão para alterar a fatura."
- Drag-and-drop: faturas virtuais e CC-txs não são reordenáveis (filtrar do payload de reorder).
- Cartão sem `statementClosingDay`: assume fechamento = `dueDay - 1`.
- Mudança de `debitAccountId` no cartão: faturas virtuais se recalculam automaticamente (sem migração de dados).

## 6. Arquivos

**Criar**: `supabase/migrations/<ts>_*.sql`, `src/lib/creditCard.ts`, `src/components/finance/InvoiceDetailsDialog.tsx`, `src/pages/CreditCardInvoices.tsx`.

**Editar**: `src/types/finance.ts`, `src/services/accountsService.ts`, `src/components/finance/AccountForm.tsx`, `src/hooks/useTransactions.ts`, `src/hooks/useMultiMonthTransactions.ts`, `src/components/finance/TransactionItem.tsx`, `src/components/finance/TransactionForm.tsx`, `src/pages/Accounts.tsx`, `src/App.tsx` (rota).

Aprova esse desenho?
