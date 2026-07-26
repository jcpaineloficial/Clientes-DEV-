# JC Painel — Base Única de Testes Reais

Esta é a base de continuidade do projeto.

## Abrir e testar

1. Admin: `index.html`
2. Clientes e permissões: `painel-clientes.html`
3. Index/Gerenciador do cliente: `geradores/index.html`
4. Links e códigos: `painel-links.html`
5. Teste de conexão: `teste-conexao.html`

## Fonte de dados atual

- Continuar usando o Supabase antigo.
- Não desligar, apagar ou migrar o projeto antigo ainda.
- O Supabase novo só será conectado depois da aprovação dos módulos.

## Regra principal

Existe apenas um painel e um Index. Não criar Painel V2, Index V2 ou visualização separada.

Cada módulo segue este ciclo:

`ajustar → testar com cliente real → corrigir → aprovar → congelar → próximo módulo`

Leia também:

- `JC-PROJETO-STATUS.md`
- `DECISOES-OFICIAIS-JC.md`
- `PROXIMO-PASSO.md`
