curl -X POST "http://localhost:3000/api" \                                                                        ~/nets/comment-pr
  -H "Content-Type: application/json" \
  -d '{
    "name": "mica",
    "comment": "hoi",
    "path": "comments.yaml"
}'
