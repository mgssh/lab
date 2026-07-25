terraform {

  backend "azurerm" {
    resource_group_name  = "rg-tfstate-books"
    storage_account_name = "sttfstatebooksem0dwn"
    container_name       = "tfstate"
    key                  = "dev.tfstate"
    use_azuread_auth     = true
  }
}
