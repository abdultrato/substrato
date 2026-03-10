# ☸️ Kubernetes - Deployment Guide

## 📋 Visão Geral

Substrato está pronto para deploy em Kubernetes com:

```
kubernetes/
├─ base/                      # Manifestos base (reutilizáveis)
│  ├─ backend-deployment.yaml # Django backend + HPA
│  ├─ postgres-statefulset.yaml # PostgreSQL persistent
│  ├─ ingress.yaml            # NGINX Ingress + SSL
│  └─ configmap-secret.yaml   # Configurações e secrets
└─ overlays/
   ├─ dev/                    # Desenvolvimento (minikube)
   ├─ staging/                # Staging (AWS/GCP)
   └─ prod/                   # Produção (scale infinito)
```

---

## 🚀 Deploy Rápido (Minikube)

### 1. Instalar Minikube

```bash
# macOS
brew install minikube

# Linux
curl -LO https://github.com/kubernetes/minikube/releases/latest/download/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube
```

### 2. Iniciar Minikube

```bash
minikube start --cpus=4 --memory=8192 --disk-size=20gb

# Verify
kubectl cluster-info
```

### 3. Build Docker Images (Local)

```bash
# Use minikube docker
eval $(minikube docker-env)

# Build images
docker build -f Dockerfile -t substrato-backend:latest .
docker build -f Dockerfile.frontend -t substrato-frontend:latest .
```

### 4. Deploy para Kubernetes

```bash
# Create namespace
kubectl create namespace substrato

# Apply manifests
kubectl apply -f kubernetes/base/ -n substrato

# Verify
kubectl get pods -n substrato
kubectl get services -n substrato
```

### 5. Acessar Aplicação

```bash
# Port-forward
kubectl port-forward svc/substrato-backend 8000:80 -n substrato
kubectl port-forward svc/substrato-frontend 3000:80 -n substrato

# URLs
# Backend: http://localhost:8000
# Frontend: http://localhost:3000
```

---

## 📊 Componentes Kubernetes

### 1. Deployment - Backend (Django)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: substrato-backend
spec:
  replicas: 3  # 3 pods para HA
  # Rolling updates (zero downtime)
  # Liveness + Readiness probes
  # Resource limits (CPU/Memory)
```

**Features**:
- ✅ 3 replicas (High Availability)
- ✅ Rolling updates (zero-downtime deployments)
- ✅ Liveness probe (/health/live)
- ✅ Readiness probe (/health/ready)
- ✅ Resource requests/limits
- ✅ Security context (non-root user)
- ✅ Pod anti-affinity (spread across nodes)

### 2. StatefulSet - PostgreSQL

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres
  # Persistent volume claim
  # Stable network identity
  # Ordered pod management
```

**Features**:
- ✅ StatefulSet para dados persistentes
- ✅ PersistentVolumeClaim (20GB)
- ✅ Liveness/Readiness probes
- ✅ Backup ready

### 3. HorizontalPodAutoscaler (HPA)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: substrato-backend-hpa
spec:
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - cpu: 70%
    - memory: 80%
```

**Features**:
- ✅ Auto-scale based on CPU/Memory
- ✅ Min 2, Max 10 replicas
- ✅ Intelligent scale-up/down

### 4. Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: substrato-backend
spec:
  type: ClusterIP
  selector:
    app: substrato
    component: backend
```

### 5. Ingress (NGINX + SSL)

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: substrato-ingress
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - api.seudominio.com
    secretName: substrato-tls
```

**Features**:
- ✅ NGINX Ingress Controller
- ✅ Let's Encrypt SSL (auto-renew)
- ✅ Rate limiting
- ✅ Multiple hosts (api + app)

---

## 🔐 ConfigMap & Secrets

### ConfigMap (Valores públicos)

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: substrato-config
data:
  allowed-hosts: "api.seudominio.com"
  postgres-db: "substrato_db"
```

### Secret (Valores sensíveis)

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: substrato-secrets
stringData:
  django-secret-key: "YOUR_SECRET_KEY"
  postgres-password: "YOUR_PASSWORD"
  database-url: "postgresql://user:pass@host/db"
```

**⚠️ IMPORTANTE**: Usar Vault/Sealed Secrets em produção!

---

## 📝 Deploy em Produção (AWS EKS)

### 1. Criar EKS Cluster

```bash
# Instalar eksctl
brew install eksctl

# Criar cluster
eksctl create cluster --name=substrato --region=us-east-1 --nodes=3

# Verify
kubectl get nodes
```

### 2. Configurar ECR (Container Registry)

```bash
# Login ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com

# Tag images
docker tag substrato-backend:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/substrato-backend:latest
docker tag substrato-frontend:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/substrato-frontend:latest

# Push
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/substrato-backend:latest
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/substrato-frontend:latest
```

### 3. Update Manifests

```yaml
# kubernetes/overlays/prod/backend-patch.yaml
- op: replace
  path: /spec/template/spec/containers/0/image
  value: 123456789.dkr.ecr.us-east-1.amazonaws.com/substrato-backend:v1.0.0
```

### 4. Deploy com Secrets Seguros

```bash
# Usar AWS Secrets Manager
kubectl create secret generic substrato-secrets \
  --from-literal=django-secret-key=$(aws secretsmanager get-secret-value --secret-id django-secret-key --query SecretString --output text) \
  -n substrato
```

### 5. Deploy Aplicação

```bash
# Apply manifests
kubectl apply -k kubernetes/overlays/prod/ -n substrato

# Monitor
kubectl logs -f deployment/substrato-backend -n substrato
kubectl describe pod <pod-name> -n substrato
```

---

## 🔄 Operações Comuns

### Ver Status

```bash
# Deployments
kubectl get deployments -n substrato

# Pods
kubectl get pods -n substrato -o wide

# Services
kubectl get svc -n substrato

# Ingress
kubectl get ingress -n substrato
```

### Logs

```bash
# Ver logs
kubectl logs <pod-name> -n substrato

# Follow logs
kubectl logs -f <pod-name> -n substrato

# Múltiplos pods
kubectl logs -l app=substrato -n substrato
```

### Scaling

```bash
# Escalar manualmente
kubectl scale deployment substrato-backend --replicas=5 -n substrato

# Verificar HPA
kubectl get hpa -n substrato
kubectl describe hpa substrato-backend-hpa -n substrato
```

### Updates

```bash
# Update image (rolling)
kubectl set image deployment/substrato-backend \
  backend=substrato-backend:v2.0.0 -n substrato

# Rollback se precisar
kubectl rollout undo deployment/substrato-backend -n substrato

# Check status
kubectl rollout status deployment/substrato-backend -n substrato
```

### Troubleshooting

```bash
# Describe pod
kubectl describe pod <pod-name> -n substrato

# Shell access
kubectl exec -it <pod-name> -n substrato -- /bin/bash

# Events
kubectl get events -n substrato

# Top (resource usage)
kubectl top pods -n substrato
```

---

## 📊 Monitoring & Observability

### Prometheus (Metrics)

```yaml
# kubernetes/base/prometheus.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: substrato-backend
spec:
  selector:
    matchLabels:
      app: substrato
  endpoints:
  - port: metrics
    interval: 30s
```

### Grafana (Dashboards)

```bash
# Install via Helm
helm repo add grafana https://grafana.github.io/helm-charts
helm install grafana grafana/grafana -n monitoring
```

### Loki (Logging)

```bash
# Install via Helm
helm repo add grafana https://grafana.github.io/helm-charts
helm install loki grafana/loki-stack -n logging
```

---

## 🎯 Checklist de Deploy

- [ ] Docker images testadas localmente
- [ ] Kubernetes manifests validados (`kubectl --dry-run`)
- [ ] ConfigMaps configurados
- [ ] Secrets criados/atualizados
- [ ] PersistentVolumes criados (para BD)
- [ ] Ingress + SSL/TLS configurado
- [ ] HPA policies configuradas
- [ ] Resource requests/limits definidos
- [ ] Health checks implementados
- [ ] Monitoring/Logging setup
- [ ] Backup strategy para BD
- [ ] Disaster recovery plano

---

## 📚 Recursos

- [Kubernetes Docs](https://kubernetes.io/docs/)
- [AWS EKS Docs](https://docs.aws.amazon.com/eks/)
- [Helm Charts](https://artifacthub.io/)
- [kube-prometheus-stack](https://github.com/prometheus-community/helm-charts)

---

**Criado em**: 11/03/2026
**Status**: Production-ready ✅
**Próximo**: Monitoramento + Alerting
