import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MetaService } from './meta.service';

@ApiTags('meta')
@Controller('meta')
export class MetaController {
  constructor(private readonly metaService: MetaService) {}

  @Get('title')
  @ApiOperation({
    summary: 'Fetch the page title for any URL',
    description:
      'Fetches the <title> tag from the given URL server-side (avoids CORS). ' +
      'Returns null title on fetch failure rather than erroring.',
  })
  @ApiQuery({ name: 'url', required: true, example: 'https://github.com/org/repo/issues/42' })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        title: 'Fix login bug · Issue #42 · org/repo',
        url: 'https://github.com/org/repo/issues/42',
      },
    },
  })
  async getTitle(@Query('url') url: string) {
    if (!url) throw new BadRequestException('url query param is required');
    return this.metaService.fetchTitle(url);
  }
}
