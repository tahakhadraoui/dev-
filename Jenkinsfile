pipeline {
    agent any
    environment {
        DOCKER_REGISTRY = "tahakhadraoui"
        IMAGE_TAG = "${env.BUILD_NUMBER}"
        DEPLOY_REPO = "https://github.com/tahakhadraoui/apps-deploy.git"
    }

    stages {
        stage('Checkout Dev Repo') {
            steps {
                git branch: 'main', url: 'https://github.com/tahakhadraoui/dev-.git'
            }
        }

        stage('Build & Push Docker Images') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'dockerhub-cred', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    sh 'docker login -u $DOCKER_USER -p $DOCKER_PASS'

                    // NestJS backend
                    sh "docker build -t $DOCKER_REGISTRY/nestjs:$IMAGE_TAG ./ppp"
                    sh "docker push $DOCKER_REGISTRY/nestjs:$IMAGE_TAG"

                    // Flask service
                    sh "docker build -t $DOCKER_REGISTRY/flask:$IMAGE_TAG ./injury-prediction-service"
                    sh "docker push $DOCKER_REGISTRY/flask:$IMAGE_TAG"

                    // Next.js frontend
                    sh "docker build -t $DOCKER_REGISTRY/nextjs:$IMAGE_TAG ./ecommerce-platform"
                    sh "docker push $DOCKER_REGISTRY/nextjs:$IMAGE_TAG"
                }
            }
        }

        stage('Update Helm Charts in apps-deploy') {
            steps {
                git branch: 'main', url: "$DEPLOY_REPO"

                sh """
                sed -i 's/tag:.*/tag: $IMAGE_TAG/' charts/backend/values.yaml
                sed -i 's/tag:.*/tag: $IMAGE_TAG/' charts/flask/values.yaml
                sed -i 's/tag:.*/tag: $IMAGE_TAG/' charts/frontend/values.yaml
                git add charts/backend/values.yaml charts/flask/values.yaml charts/frontend/values.yaml
                git commit -m "Update Docker image tags to $IMAGE_TAG"
                git push
                """
            }
        }
    }

    post {
        always {
            echo "Pipeline finished"
        }
    }
}
