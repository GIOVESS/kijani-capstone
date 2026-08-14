pipeline {
    agent any

    environment {
        STAGING_NAMESPACE = 'kijani-staging'
        DEPLOYMENT_NAME   = 'kk-payments'
    }

    options {
        timeout(time: 15, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
        disableConcurrentBuilds()
    }

    stages {
        stage('Deploy to Staging') {
            steps {
                sh '''
                    set -e
                    kubectl apply -f k8s/kk-payments-deployment.yaml
                    kubectl apply -f k8s/kk-payments-service.yaml
                    kubectl rollout status deployment/${DEPLOYMENT_NAME} -n ${STAGING_NAMESPACE} --timeout=120s
                '''
            }
        }

        stage('Smoke Test') {
            steps {
                sh '''
                    set -e
                    kubectl run smoke-test-${BUILD_NUMBER} \
                        --image=curlimages/curl:latest \
                        --rm -i --restart=Never \
                        -n ${STAGING_NAMESPACE} \
                        --command -- curl -sf --max-time 5 \
                        http://${DEPLOYMENT_NAME}.${STAGING_NAMESPACE}.svc.cluster.local:3001/health
                '''
            }
        }

        stage('Approve Production Deployment') {
            steps {
                input(
                    message: "Deploy kk-payments (build ${BUILD_NUMBER}) to production? Staging smoke test passed.",
                    ok: 'Deploy',
                    submitter: 'giovess',
                    parameters: [
                        text(
                            name: 'APPROVAL_REASON',
                            description: 'Reason for approval (required for audit trail)'
                        )
                    ]
                )
            }
        }

        stage('Deploy to Production') {
            steps {
                sh '''
                    set -e
                    kubectl apply -f k8s/kk-payments-deployment-prod.yaml
                    kubectl apply -f k8s/kk-payments-service-prod.yaml
                    kubectl rollout status deployment/${DEPLOYMENT_NAME} -n kijani-project --timeout=120s
                '''
            }
        }
    }

    post {
        always {
            echo "Pipeline complete. Build: ${BUILD_NUMBER}, Result: ${currentBuild.currentResult}"
        }
    }
}
