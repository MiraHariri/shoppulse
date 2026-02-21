# ============================================================================
# QuickSight Embed Lambda Integration
# Replaces the temporary MOCK integration with actual Lambda function
# ============================================================================

# Data source to get the deployed Lambda function
data "aws_lambda_function" "quicksight_embed" {
  function_name = "dev-shoppulse-quicksight-embed"
}

# Lambda permission for API Gateway to invoke QuickSight Embed Lambda
resource "aws_lambda_permission" "quicksight_embed_api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = data.aws_lambda_function.quicksight_embed.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

# API Gateway Integration for GET /dashboards/embed-url
resource "aws_api_gateway_integration" "dashboards_embed_url_get" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.dashboards_embed_url.id
  http_method             = aws_api_gateway_method.dashboards_embed_url_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = data.aws_lambda_function.quicksight_embed.invoke_arn

  depends_on = [aws_lambda_permission.quicksight_embed_api_gateway]
}

# Note: AWS_PROXY integration automatically handles responses
# No need for method_response or integration_response resources
