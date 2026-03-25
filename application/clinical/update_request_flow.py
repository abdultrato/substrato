from domain.clinical.request_rules import RequestFlow


class UpdateRequestFlow:
    @staticmethod
    def execute(request):

        new_status = RequestFlow.determine_status(request)

        request.aplicar_status(new_status)

        return request
