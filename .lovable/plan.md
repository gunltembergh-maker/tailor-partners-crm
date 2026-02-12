

# Importacao da Base CRM para Contas

## Resumo

Importar os ~770 clientes da planilha Base_CRM.xlsx para a tabela `clients`, mapeando todas as colunas relevantes e preenchendo os campos `banker_name`, `finder_name` e `canal`.

---

## O que vai acontecer

1. Todos os ~770 clientes da planilha serao inseridos na tabela de Contas
2. Cada cliente tera os campos Banker, Finder e Canal preenchidos conforme a planilha
3. Os campos `banker_id` e `assessor_id` ficarao nulos por enquanto (os usuarios ainda nao se cadastraram no sistema)
4. O tipo de pessoa sera mapeado automaticamente: "PESSOA FISICA" para PF, "PESSOA JURIDICA" para PJ

---

## Mapeamento de colunas (Planilha -> Banco)

```text
Nome Cliente         -> nome_razao
Documento            -> cpf_cnpj
Tipo de Cliente      -> tipo_pessoa (PF ou PJ)
PL Tailor            -> patrimonio_ou_receita
Setor                -> segmento
Banker               -> banker_name
Finder               -> finder_name
Canal                -> canal
```

Valores como "Sem Finder" e "Sem Canal" serao tratados como nulo.

---

## Detalhes Tecnicos

### 1. Edge function `import-clients`

Criar uma edge function que:
- Recebe os dados dos clientes em JSON via POST
- Usa a service role key para inserir diretamente, contornando o RLS
- Faz upsert por `cpf_cnpj` para evitar duplicatas
- Mapeia "PESSOA FISICA" -> "PF" e "PESSOA JURIDICA" -> "PJ"
- Trata "Sem Finder", "Sem Canal" como null
- Insere em lotes de 50 para evitar timeouts

### 2. Script de chamada no frontend

Criar uma pagina/componente temporario de administracao (ou usar a propria edge function diretamente) que:
- Prepara os ~770 registros em formato JSON a partir dos dados ja parseados da planilha
- Chama a edge function para fazer a importacao
- Exibe o resultado (quantos registros importados com sucesso)

### 3. Alternativa mais simples (recomendada)

Como os dados ja foram parseados, gerar um SQL INSERT direto via migracao com todos os ~770 registros. Isso e mais rapido e nao requer edge function.

A migracao ira:
- Inserir todos os registros de uma vez
- Usar `ON CONFLICT (cpf_cnpj) DO NOTHING` se adicionarmos um indice unico no cpf_cnpj, ou simplesmente inserir tudo de uma vez (tabela esta vazia)

### Arquivos criados/modificados

- `supabase/functions/import-clients/index.ts` - edge function para importacao em massa
- Ou: nova migracao SQL com todos os INSERTs (abordagem mais simples)

A abordagem recomendada e usar a edge function, pois permite reusar no futuro para atualizacoes de base.

