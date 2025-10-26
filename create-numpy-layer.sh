#!/bin/bash
# Create a numpy layer compatible with AWS Lambda Python 3.9

mkdir -p /tmp/numpy-layer/python
cd /tmp/numpy-layer

# Use Docker to build in Lambda environment
docker run --rm -v "$PWD":/var/task public.ecr.aws/lambda/python:3.9 \
  bash -c "pip install numpy==1.24.3 -t /var/task/python/ && find /var/task/python -type d -name '__pycache__' -exec rm -rf {} +"

# Create layer zip
cd /tmp/numpy-layer && zip -r /Users/khushisavaliya/Downloads/ABC/numpy-layer.zip python/ -q

echo "✅ NumPy layer created: numpy-layer.zip"
ls -lh /Users/khushisavaliya/Downloads/ABC/numpy-layer.zip
