# Temporary MOCK integrations for dashboard and governance endpoints
# These will be replaced with actual Lambda integrations when those functions are deployed

# GET /dashboards/embed-url - Temporary MOCK
resource "aws_api_gateway_integration" "dashboards_embed_url_get_temp" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.dashboards_embed_url.id
  http_method = aws_api_gateway_method.dashboards_embed_url_get.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = jsonencode({
      statusCode = 501
    })
  }
}

resource "aws_api_gateway_method_response" "dashboards_embed_url_get_temp" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.dashboards_embed_url.id
  http_method = aws_api_gateway_method.dashboards_embed_url_get.http_method
  status_code = "501"

  response_models = {
    "application/json" = "Empty"
  }
}

resource "aws_api_gateway_integration_response" "dashboards_embed_url_get_temp" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.dashboards_embed_url.id
  http_method = aws_api_gateway_method.dashboards_embed_url_get.http_method
  status_code = "501"

  response_templates = {
    "application/json" = jsonencode({
      message = "Not implemented yet - QuickSight embed Lambda function coming soon"
    })
  }

  depends_on = [aws_api_gateway_integration.dashboards_embed_url_get_temp]
}

# GET /dashboards/list - Temporary MOCK
resource "aws_api_gateway_integration" "dashboards_list_get_temp" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.dashboards_list.id
  http_method = aws_api_gateway_method.dashboards_list_get.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = jsonencode({
      statusCode = 501
    })
  }
}

resource "aws_api_gateway_method_response" "dashboards_list_get_temp" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.dashboards_list.id
  http_method = aws_api_gateway_method.dashboards_list_get.http_method
  status_code = "501"

  response_models = {
    "application/json" = "Empty"
  }
}

resource "aws_api_gateway_integration_response" "dashboards_list_get_temp" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.dashboards_list.id
  http_method = aws_api_gateway_method.dashboards_list_get.http_method
  status_code = "501"

  response_templates = {
    "application/json" = jsonencode({
      message = "Not implemented yet - Dashboard list Lambda function coming soon"
    })
  }

  depends_on = [aws_api_gateway_integration.dashboards_list_get_temp]
}

# GET /governance/rules - Temporary MOCK
resource "aws_api_gateway_integration" "governance_rules_get_temp" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.governance_rules.id
  http_method = aws_api_gateway_method.governance_rules_get.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = jsonencode({
      statusCode = 501
    })
  }
}

resource "aws_api_gateway_method_response" "governance_rules_get_temp" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.governance_rules.id
  http_method = aws_api_gateway_method.governance_rules_get.http_method
  status_code = "501"

  response_models = {
    "application/json" = "Empty"
  }
}

resource "aws_api_gateway_integration_response" "governance_rules_get_temp" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.governance_rules.id
  http_method = aws_api_gateway_method.governance_rules_get.http_method
  status_code = "501"

  response_templates = {
    "application/json" = jsonencode({
      message = "Not implemented yet - Governance rules Lambda function coming soon"
    })
  }

  depends_on = [aws_api_gateway_integration.governance_rules_get_temp]
}

# PUT /governance/rules - Temporary MOCK
resource "aws_api_gateway_integration" "governance_rules_put_temp" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.governance_rules.id
  http_method = aws_api_gateway_method.governance_rules_put.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = jsonencode({
      statusCode = 501
    })
  }
}

resource "aws_api_gateway_method_response" "governance_rules_put_temp" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.governance_rules.id
  http_method = aws_api_gateway_method.governance_rules_put.http_method
  status_code = "501"

  response_models = {
    "application/json" = "Empty"
  }
}

resource "aws_api_gateway_integration_response" "governance_rules_put_temp" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.governance_rules.id
  http_method = aws_api_gateway_method.governance_rules_put.http_method
  status_code = "501"

  response_templates = {
    "application/json" = jsonencode({
      message = "Not implemented yet - Governance rules Lambda function coming soon"
    })
  }

  depends_on = [aws_api_gateway_integration.governance_rules_put_temp]
}
