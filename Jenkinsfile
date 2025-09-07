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
                    sh '''
                        docker login -u $DOCKER_USER -p $DOCKER_PASS

                        # NestJS backend
                        docker build -t $DOCKER_REGISTRY/nestjs:$IMAGE_TAG ./ppp
                        docker push $DOCKER_REGISTRY/nestjs:$IMAGE_TAG

                        # Flask service
                        docker build -t $DOCKER_REGISTRY/flask:$IMAGE_TAG ./injury-prediction-service
                        docker push $DOCKER_REGISTRY/flask:$IMAGE_TAG

                        # Next.js frontend
                        docker build -t $DOCKER_REGISTRY/nextjs:$IMAGE_TAG ./ecommerce-platform
                        docker push $DOCKER_REGISTRY/nextjs:$IMAGE_TAG
                    '''
                }
            }
        }

        stage('Update Helm Charts in apps-deploy') {
            steps {
                git branch: 'main', url: "$DEPLOY_REPO"

                // Use GitHub credentials for push
                withCredentials([usernamePassword(credentialsId: 'github-cred', usernameVariable: 'GIT_USER', passwordVariable: 'GIT_PASS')]) {
                    sh '''
                        # Update image tags in Helm charts
                        sed -i "s/tag:.*/tag: $IMAGE_TAG/" charts/backend/values.yaml
                        sed -i "s/tag:.*/tag: $IMAGE_TAG/" charts/flask/values.yaml
                        sed -i "s/tag:.*/tag: $IMAGE_TAG/" charts/frontend/values.yaml

                        git add charts/backend/values.yaml charts/flask/values.yaml charts/frontend/values.yaml

                        # Commit only if there are changes
                        git diff --cached --quiet || git commit -m "Update Docker image tags to $IMAGE_TAG"

                        # Push using credentials
                        git push https://$GIT_USER:$GIT_PASS@github.com/tahakhadraoui/apps-deploy.git main --set-upstream
                    '''
                }
            }
        }
    }

    post {
        always {
            echo "Cleaning up Docker and workspace..."
            sh 'docker system prune -af --volumes || true'
            cleanWs()
            echo "Pipeline finished"
        }
    }
}
