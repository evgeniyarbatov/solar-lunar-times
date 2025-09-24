terraform {
  backend "s3" {
    encrypt        = true
    bucket         = "arbatov-terraform-state"
    dynamodb_table = "arbatov-me-tf-state-lock"
    key            = "solar-lunar-times.tfstate"
    region         = "ap-southeast-1"
  }
}