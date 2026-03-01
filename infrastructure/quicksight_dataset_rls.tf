# QuickSight Dataset with RLS Configuration
# Add this to your existing dataset resource or create new one

resource "aws_quicksight_data_set" "main" {
  data_set_id = "shoppulse-dataset"
  name        = "ShopPulse Analytics Dataset"
  aws_account_id = var.aws_account_id

  # Your existing physical table map, logical table map, etc.
  # ...

  # Row-Level Security using Session Tags
  row_level_permission_tag_configuration {
    status = "ENABLED"
    
    # Rule 1: Filter by tenant_id
    tag_rules {
      tag_key                   = "tenant_id"
      column_name              = "tenant_id"
      tag_multi_value_delimiter = ","
      match_all_value          = "*"
    }
    
    # Rule 2: Filter by region
    tag_rules {
      tag_key                   = "region"
      column_name              = "region"
      tag_multi_value_delimiter = ","
      match_all_value          = "*"
    }
    
    # Rule 3: Filter by store_id
    tag_rules {
      tag_key                   = "store_id"
      column_name              = "store_id"
      tag_multi_value_delimiter = ","
      match_all_value          = "*"
    }
  }
}
