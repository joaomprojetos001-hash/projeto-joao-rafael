# Dashboard de Gestão de Leads - WhatsApp

Sistema de gestão centralizada para atendimento via WhatsApp com IA.

## 🚀 Quick Start

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
# Copie ENV_TEMPLATE.md e crie .env.local com suas credenciais do Supabase

# 3. Executar migrations no Supabase
# Abra SUPABASE_SETUP.sql e execute no SQL Editor do Supabase

# 4. Criar usuário de login
# No Supabase: Authentication → Users → Add User

# 5. Rodar o projeto
npm run dev
```

Acesse: **http://localhost:3000**

---

## 📚 Documentação

- **[Walkthrough Completo](../.gemini/antigravity/brain/eee042ac-51a5-4527-9a2c-c858b9fc0c9a/walkthrough.md)** - Documentação detalhada da implementação
- **[Plano de Implementação](../.gemini/antigravity/brain/eee042ac-51a5-4527-9a2c-c858b9fc0c9a/implementation_plan.md)** - Arquitetura e plano técnico
- **[Arquitetura do Sistema](../.gemini/antigravity/brain/eee042ac-51a5-4527-9a2c-c858b9fc0c9a/architecture.md)** - Diagramas e fluxos de dados
- **[Setup do Supabase](./SUPABASE_SETUP.sql)** - SQL para criar todas as tabelas

---

## 🎨 Features Implementadas (Fase 1)

### ✅ Autenticação
- Login premium com glassmorphism
- Integração com Supabase Auth
- Proteção de rotas automática
- Sessão persistente

### ✅ Dashboard Principal
- Painel de leads urgentes
- Métricas em tempo real (4 KPIs)
- Visão rápida do pipeline
- Design responsivo

### ✅ Design System
- Dark theme premium
- Gradientes vibrantes
- Micro-animações
- Componentes reutilizáveis

---

## 📋 Próximas Implementações

- [ ] **Módulo Kanban** - Chat em tempo real
- [ ] **Módulo Pipeline** - CRM drag-and-drop
- [ ] **Módulo Follow-up** - Campanhas automatizadas
- [ ] **Integração N8N** - Webhooks bidirecionais

---

## 🛠️ Stack Tecnológica

- **Framework**: Next.js 14 (App Router)
- **Linguagem**: TypeScript
- **Styling**: Vanilla CSS (Design System)
- **Database**: Supabase (PostgreSQL)
- **Autenticação**: Supabase Auth
- **Deploy**: Vercel (recomendado)

---

## 📞 Suporte

Para dúvidas sobre a configuração ou próximas implementações, consulte a [documentação completa](../.gemini/antigravity/brain/eee042ac-51a5-4527-9a2c-c858b9fc0c9a/walkthrough.md).
