# Regras operacionais do repositório

## Política temporária de branches

- Todo commit e todo push devem ser feitos diretamente na branch `main`.
- Não criar, usar nem publicar branches alternativas, incluindo branches de funcionalidade, correção ou automação.
- Antes de alterar ou publicar código, executar `git switch main` e atualizar a branch com `git pull --ff-only origin main`.
- Depois de publicar, confirmar que `git status --short --branch` mostra `main` alinhada com `origin/main`.
- Se a `main` não puder ser atualizada ou publicada com segurança, interromper a operação e comunicar o bloqueio; não contornar o problema criando outra branch.
- Esta política permanece válida até ser explicitamente revogada pelo responsável do repositório.
