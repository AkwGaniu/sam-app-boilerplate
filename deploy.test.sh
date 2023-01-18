# Test deployment script

REGION='us-east-1'
PROFILE='teachAI' # Specify the AWS credential you intend to use. This is found in ~/.aws/credentials
API_NAME='teach-ai-backend-v1-test'
TEMPLATE='template.yaml'

SAM_CONFIG_FILE="./samconfig.test.toml"

if test -f "$SAM_CONFIG_FILE"; then
    cat $SAM_CONFIG_FILE > samconfig.toml
    echo "Reusing SAM config defined in samconfig.toml..."
    sam deploy -t $TEMPLATE --stack-name $API_NAME --region $REGION --profile $PROFILE
else
    echo "Initial Setup: creating the SAM config file - samconfig.toml"
    sam deploy -t $TEMPLATE --stack-name $API_NAME --region $REGION --profile $PROFILE --guided
fi

