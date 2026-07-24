---
sidebar_position: 5
title: Kubernetes
---

# Kubernetes

This guide covers a production-grade Kubernetes deployment for Tab Pilot, including a MongoDB StatefulSet, ConfigMap, Secret, Deployment, Service, and Ingress.

:::note Single replica recommended
Tab Pilot uses Socket.io for real-time communication. Running more than one replica requires sticky sessions or a Redis adapter (not included in this guide). **Keep `replicas: 1` unless you have configured the Redis adapter.**
:::

## Prerequisites

- A running Kubernetes cluster (any distribution: GKE, EKS, AKS, k3s, etc.)
- `kubectl` configured and pointing at your cluster
- An nginx-ingress controller installed (`kubectl get ingressclass nginx`)
- Persistent volume support in your cluster (for MongoDB data)

## File Layout

Save each manifest below as a separate file in a directory named `tabpilot/`:

```
tabpilot/
  namespace.yaml
  mongodb-statefulset.yaml
  secret.yaml
  configmap.yaml
  deployment.yaml
  service.yaml
  ingress.yaml
```

## Namespace

```yaml title="tabpilot/namespace.yaml"
apiVersion: v1
kind: Namespace
metadata:
  name: tabpilot
```

## MongoDB

:::note Production MongoDB
The StatefulSet below is suitable for development and staging. For production, consider [MongoDB Atlas](https://www.mongodb.com/atlas) (managed, free tier available) or the [MongoDB Community Kubernetes Operator](https://github.com/mongodb/mongodb-kubernetes-operator) for replication and automated backups.
:::

```yaml title="tabpilot/mongodb-statefulset.yaml"
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongodb
  namespace: tabpilot
spec:
  serviceName: mongodb
  replicas: 1
  selector:
    matchLabels:
      app: mongodb
  template:
    metadata:
      labels:
        app: mongodb
    spec:
      containers:
        - name: mongodb
          image: mongo:7
          ports:
            - containerPort: 27017
          volumeMounts:
            - name: mongo-data
              mountPath: /data/db
          livenessProbe:
            exec:
              command: ["mongosh", "--eval", "db.runCommand({ ping: 1 })"]
            initialDelaySeconds: 30
            periodSeconds: 10
  volumeClaimTemplates:
    - metadata:
        name: mongo-data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 10Gi
apiVersion: v1
kind: Service
metadata:
  name: mongodb
  namespace: tabpilot
spec:
  selector:
    app: mongodb
  ports:
    - port: 27017
  clusterIP: None
```

The headless Service (`clusterIP: None`) gives the StatefulSet pod a stable DNS name: `mongodb.tabpilot.svc.cluster.local`.

## Secret

Store sensitive values in a Kubernetes Secret. Replace the placeholder values before applying.

```yaml title="tabpilot/secret.yaml"
apiVersion: v1
kind: Secret
metadata:
  name: tabpilot-secrets
  namespace: tabpilot
type: Opaque
stringData:
  MONGODB_URI: "mongodb://mongodb:27017/tabpilot"
  JIRA_API_TOKEN: ""
```

:::tip Managing Secrets safely
Do not commit this file with real values to version control. Consider [Sealed Secrets](https://github.com/bitnami-labs/sealed-secrets), [External Secrets Operator](https://external-secrets.io/), or your cloud provider's secret store integration to manage secrets outside of plain YAML.
:::

## ConfigMap

Non-sensitive configuration lives in a ConfigMap. Update `FRONTEND_URL` to match your public domain.

```yaml title="tabpilot/configmap.yaml"
apiVersion: v1
kind: ConfigMap
metadata:
  name: tabpilot-config
  namespace: tabpilot
data:
  NODE_ENV: "production"
  PORT: "3000"
  FRONTEND_URL: "https://tabpilot.example.com"
  VERTEX_AI_LOCATION: "us-central1"
```

:::warning FRONTEND_URL must match your public domain
`FRONTEND_URL` is the allowed CORS origin. If it does not exactly match the URL your users navigate to (including `https://`), all WebSocket connections and API calls will be rejected by the browser. Update this before deploying.
:::

## Deployment

```yaml title="tabpilot/deployment.yaml"
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tabpilot
  namespace: tabpilot
spec:
  replicas: 1
  selector:
    matchLabels:
      app: tabpilot
  template:
    metadata:
      labels:
        app: tabpilot
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 0
      containers:
        - name: tabpilot
          image: ghcr.io/gautamkrishnar/tabpilot:latest
          ports:
            - containerPort: 3000
          envFrom:
            - configMapRef:
                name: tabpilot-config
            - secretRef:
                name: tabpilot-secrets
          livenessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 20
            periodSeconds: 30
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 10
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
```

The pod runs as UID `1001` (non-root), matching the user the image was built with. No privilege escalation is needed.

## Service

```yaml title="tabpilot/service.yaml"
apiVersion: v1
kind: Service
metadata:
  name: tabpilot
  namespace: tabpilot
spec:
  selector:
    app: tabpilot
  ports:
    - port: 80
      targetPort: 3000
```

## Ingress

The Ingress uses nginx-ingress. The annotations set long proxy timeouts and configure WebSocket upgrade passthrough for the `/socket.io/` path.

```yaml title="tabpilot/ingress.yaml"
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: tabpilot
  namespace: tabpilot
  annotations:
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
    nginx.ingress.kubernetes.io/server-snippets: |
      location /socket.io/ {
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_http_version 1.1;
      }
spec:
  ingressClassName: nginx
  rules:
    - host: tabpilot.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: tabpilot
                port:
                  number: 80
```

:::tip TLS with cert-manager
To enable HTTPS, install [cert-manager](https://cert-manager.io/) and add a `tls` block to the Ingress spec along with the `cert-manager.io/cluster-issuer` annotation:

```yaml
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
  tls:
    - hosts:
        - tabpilot.example.com
      secretName: tabpilot-tls
```
:::

## Scaling Warning

:::warning Socket.io and multiple replicas
Socket.io maintains persistent WebSocket connections. If you scale the Deployment beyond 1 replica, clients must always reconnect to the **same pod** (sticky sessions). Without sticky sessions, a client routed to a different pod will not receive events from the session it joined.

**Options:**
- Keep `replicas: 1` (recommended for most teams)
- Configure nginx-ingress sticky sessions via `nginx.ingress.kubernetes.io/affinity: "cookie"`
- Add a Redis adapter to the API and share state across pods (requires code changes)
:::

## Deploying

Apply all manifests at once:

```bash
kubectl apply -f tabpilot/
```

Check the rollout status:

```bash
kubectl rollout status deployment/tabpilot -n tabpilot
```

Tail the app logs:

```bash
kubectl logs -f deployment/tabpilot -n tabpilot
```

Verify the health endpoint from inside the cluster:

```bash
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -n tabpilot -- \
  curl http://tabpilot/api/health
```

## Updating Tab Pilot

To deploy a new image version, update the `image` field in `deployment.yaml` and apply:

```bash
# Edit deployment.yaml to change the image tag, then:
kubectl apply -f tabpilot/deployment.yaml

# Or trigger a rolling restart to re-pull the latest tag:
kubectl rollout restart deployment/tabpilot -n tabpilot

# Watch the rollout progress:
kubectl rollout status deployment/tabpilot -n tabpilot
```

MongoDB data is stored in the PersistentVolumeClaim (`mongo-data`) and is unaffected by app restarts.

## AI Ticket Scoring (GCP Service Account)

The optional AI ticket scoring feature requires a Google Cloud service account JSON key. Mount it into the pod using a Secret:

**1. Create the Secret from your key file:**

```bash
kubectl create secret generic gcp-sa-key \
  --from-file=gcp-sa.json=/path/to/your/service-account.json \
  -n tabpilot
```

**2. Add the volume and mount to the Deployment:**

```yaml
      containers:
        - name: tabpilot
          # ... existing fields ...
          env:
            - name: GOOGLE_APPLICATION_CREDENTIALS
              value: /secrets/gcp-sa.json
          volumeMounts:
            - name: gcp-sa
              mountPath: /secrets
              readOnly: true
      volumes:
        - name: gcp-sa
          secret:
            secretName: gcp-sa-key
```

**3. Apply the updated Deployment:**

```bash
kubectl apply -f tabpilot/deployment.yaml
```

See [AI Ticket Scoring](../configuration/ai-ticket-scoring.md) for the full feature setup.
